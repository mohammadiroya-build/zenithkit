import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { compileCustomSolidity, customCompilerTimeout } from "../dist/assets/custom-compiler.js";
import { collectCustomImports, solidityImports } from "../dist/assets/custom-imports.js";
import { compileSolidity } from "../dist/assets/solidity-compile.js";
import { getCompilerBuild } from "../dist/assets/compiler-versions.js";
import { fixedUsing, nft, solidity, upgradeable, uploadedProject } from "./compiler-fixtures.mjs";

const root = new URL("../dist/compiler/", import.meta.url);
const require = createRequire(import.meta.url);
const modern = "5.0.2";
const legacy = "4.9.6";
const bundle = Object.fromEntries([modern, legacy].map(version => [
  version, JSON.parse(readFileSync(new URL(`openzeppelin-${version}.json`, root), "utf8")),
]));
const namespace = "@openzeppelin/contracts/";
const guard = "security/ReentrancyGuard.sol";
const math = "utils/math/SafeMath.sol";
const modernGuard = "utils/ReentrancyGuard.sol";
const factory = version => {
  let response;
  const self = { postMessage: data => { response = data; } };
  runInNewContext(readFileSync(new URL(`worker-${version}.js`, root), "utf8"), {
    Module: require(`../dist/compiler/soljson-${version}.js`), self,
  });
  return input => {
    self.onmessage({ data: input });
    if (response.error) throw new Error(response.error);
    return response;
  };
};
const legacySource = solidity(`
import /* legacy guard */ {ReentrancyGuard} from '${namespace}${guard}';
import {
  SafeMath as Checked
} from "${namespace}${math}";
import {Ownable} from "node_modules/${namespace}access/Ownable.sol";
contract Counter is ReentrancyGuard, Ownable {
  using Checked for uint256;
  uint256 public value;
  function add(uint256 amount) external onlyOwner nonReentrant { value = value.add(amount); }
}`);
const dual = solidity(`
import {ReentrancyGuard} from "${namespace}${modernGuard}";
import {SafeMath} from "${namespace}${math}";
contract Counter is ReentrancyGuard {
  using SafeMath for uint256;
  uint256 public value;
  function add(uint256 amount) external nonReentrant { value = value.add(amount); }
}`);

test("import scanner handles all declaration forms, comments, escapes and quoted decoys", () => {
  const source = String.raw`
    // import "fake.sol";
    /* import "other.sol"; */
    import "one.sol" as One;
    import * as Two from 'two.sol';
    import {Three as T, Four} from "./nested/\x66ile.sol";
    import
      "four.sol";
    contract C { string constant decoy = 'import "bad.sol";'; }
  `;
  assert.deepEqual([...solidityImports(source)], ["one.sol", "two.sol", "./nested/file.sol", "four.sol"]);
});

test("canceling a pending Custom compile disposes the worker and its URL", async () => {
  const controller = new AbortController();
  const events = [];
  const reason = new Error("Source changed");
  const worker = {
    postMessage(input) {
      if (input.prepare) queueMicrotask(() => this.onmessage({ data: { prepared: true } }));
      else {
        events.push("compiling");
        queueMicrotask(() => controller.abort(reason));
      }
    },
    terminate() { events.push("terminated"); },
  };
  assert.equal(customCompilerTimeout, 90_000);
  await assert.rejects(compileCustomSolidity("contract Demo {}", "", [], controller.signal, "0.8.28",
    async () => ({ worker, release() { events.push("released"); } })), error => error === reason);
  assert.deepEqual(events, ["compiling", "terminated", "released"]);
  assert.equal(worker.onmessage, null);
});

for (const version of ["0.8.24", "0.8.28"]) {
  test(`Custom compiler ${version}: dependency closure and artifact`, async t => {
    const run = factory(version);
    let passes = [];
    let loads = [];
    const compile = (source, name = "", uploads = []) => {
      passes = [];
      loads = [];
      return compileSolidity(source, name, {}, input => {
        passes.push(structuredClone(input));
        return run(input);
      }, uploads, getCompilerBuild(version), (sources, rules) => collectCustomImports(sources, rules, release => {
        loads.push(release);
        return bundle[release];
      }));
    };

    await t.test("legacy guard, SafeMath and Ownable arrive before the first compiler call", async () => {
      const artifact = await compile(legacySource);
      const canonical = `node_modules/${namespace}`;
      assert.equal(passes.length, 1);
      assert.equal(passes[0].sources[canonical + guard].content, bundle[legacy][namespace + guard]);
      assert.equal(passes[0].sources[canonical + math].content, bundle[legacy][namespace + math]);
      assert.ok(passes[0].sources[canonical + "utils/Context.sol"]);
      assert.deepEqual(passes[0].settings.remappings, [`${namespace}=${canonical}`]);
      assert.deepEqual(Object.keys(passes[0].settings.outputSelection), ["Custom.sol"]);
      assert.equal(artifact.input.sources["Custom.sol"].content, legacySource);
      assert.equal(artifact.compilerVersion, getCompilerBuild(version));
      assert.ok(artifact.abi.some(item => item.name === "owner"));
      assert.match(artifact.bytecode, /^0x[a-f\d]+$/);
      const replay = run(artifact.input).output;
      assert.equal(`0x${replay.contracts["Custom.sol"].Counter.evm.bytecode.object}`, artifact.bytecode);
    });

    await t.test("modern guard can be used with legacy SafeMath and explicit Standard JSON remappings", async () => {
      const rules = ["@openzeppelin/=node_modules/@openzeppelin/"];
      const artifact = await compile(JSON.stringify({
        language: "Solidity",
        sources: { "src/Counter.sol": { content: dual } },
        settings: { remappings: rules, optimizer: { runs: 417 } },
      }), "src/Counter.sol:Counter");
      assert.equal(passes.length, 1);
      assert.deepEqual(artifact.input.settings.remappings, rules);
      assert.equal(artifact.input.settings.optimizer.runs, 417);
      assert.equal(artifact.input.sources[`node_modules/${namespace}${modernGuard}`].content, bundle[modern][namespace + modernGuard]);
      assert.equal(artifact.input.sources[`node_modules/${namespace}${math}`].content, bundle[legacy][namespace + math]);
    });

    await t.test("modern alias forms share one source unit and skip loading the legacy index", async () => {
      const artifact = await compile(nft.replace(
        `${namespace.slice(0, -1)}@5.0.2/utils/Strings.sol`,
        "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v5.0.2/contracts/utils/Strings.sol",
      ));
      assert.deepEqual(loads, [modern]);
      assert.equal(passes.length, 1);
      assert.ok(artifact.input.sources[`node_modules/${namespace}utils/Strings.sol`]);
      assert.ok(artifact.abi.some(item => item.name === "tokenByIndex"));
    });

    await t.test("nested uploads and relative imports are resolved without replacing their contents", async () => {
      const artifact = await compile("", "", uploadedProject);
      assert.equal(passes.length, 1);
      assert.equal(artifact.source, "project/src/Custom.sol");
      assert.ok(artifact.input.sources["project/node_modules/vendor/lib/Salt.sol"]);
    });

    await t.test("upgradeable releases use matching dependencies, including a pinned modern package in a legacy build", async () => {
      const files = {
        "src/Reserve.sol": { content: upgradeable.replaceAll(
          "@openzeppelin/contracts-upgradeable/", "@openzeppelin/contracts-upgradeable@5.0.2/",
        ) },
        "src/Legacy.sol": { content: solidity(`import "${namespace}${guard}";`) },
      };
      const artifact = await compile(JSON.stringify({ language: "Solidity", sources: files }), "src/Reserve.sol:UpgradeableReserve");
      assert.equal(passes.length, 1);
      assert.ok(artifact.abi.some(item => item.name === "initialize"));
      assert.ok(Object.keys(artifact.input.sources).some(path => path.includes("contracts-upgradeable@5.0.2/")));
      assert.ok(Object.keys(artifact.input.sources).some(path => path.includes("contracts@5.0.2/")));
    });

    await t.test("scoped and long remappings follow the compiler and can target an installed tree", async () => {
      const source = solidity(`
        import {Owned} from "vendor/Other.sol";
        import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
        contract Custom is Owned { function label(uint256 n) external pure returns (string memory) { return Strings.toString(n); } }
      `);
      const paths = ["vendor/Other.sol=invalid/Other.sol", "src/:vendor/=alt/",
        "@openzeppelin/=workspace/node_modules/@openzeppelin/"];
      const json = JSON.stringify({
        language: "Solidity",
        sources: {
          "src/Custom.sol": { content: source },
          "alt/Other.sol": { content: solidity("contract Owned {}") },
        },
        settings: { remappings: paths },
      });
      const artifact = await compile(json, "src/Custom.sol:Custom");
      assert.equal(passes.length, 1);
      assert.deepEqual(artifact.input.settings.remappings, paths);
      assert.ok(artifact.input.sources["workspace/node_modules/@openzeppelin/contracts/utils/math/Math.sol"]);
    });

    await t.test("an uploaded package wins, and a half-uploaded different release is not mixed", async () => {
      const name = "project/node_modules/@openzeppelin/contracts/utils/Strings.sol";
      const alternate = solidity(`library Strings { function toString(uint256) internal pure returns (string memory) { return "local"; } }`);
      const src = fixedUsing.replace("@5.0.2", "");
      assert.equal((await compile(src, "", [{ path: name, content: alternate }])).input.sources[name].content, alternate);
      assert.deepEqual(loads, []);
      await assert.rejects(compile(`${src}\nimport "${namespace}utils/math/Math.sol";`, "", [{ path: name, content: alternate }]),
        /Math\.sol" not found/);
    });

    await t.test("pinned versions do not silently substitute missing sources; plain source avoids fetching OpenZeppelin", async () => {
      await assert.rejects(compile(legacySource.replaceAll(namespace, "@openzeppelin/contracts@5.0.2/")),
        /SafeMath\.sol" not found:[^\n]*Supply the exact imported file/);
      assert.equal(passes.length, 1);
      assert.deepEqual(loads, [modern]);
      assert.equal((await compile(solidity(`contract Fresh { string constant a = 'import "decoy";'; }`))).symbol, "Fresh");
      assert.deepEqual(loads, []);
    });
  });
}
