import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { compilationSource, compileSolidity, normalizeSolidityIndentation } from "../dist/assets/solidity-compile.js";
import { getCompilerBuild } from "../dist/assets/compiler-versions.js";
import { fixedUsing, invalidType, invalidUsing, nft, solidity, upgradeable, uploadedProject } from "./compiler-fixtures.mjs";
import { encodeDraftLiterals } from "../workers/contracts.mjs";

const require = createRequire(import.meta.url);
const compilerRoot = new URL("../dist/compiler/", import.meta.url);
const bundled = JSON.parse(readFileSync(new URL("openzeppelin-5.0.2.json", compilerRoot), "utf8"));
const svgSource = solidity(`
import "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.0.2/utils/Base64.sol";
import "@openzeppelin/contracts@5.0.2/utils/Strings.sol";
contract SvgMedal is ERC721 {
    using Strings for uint256;
    constructor() ERC721("Medal", "MEDAL") {}
    function issue() external { _safeMint(msg.sender, 1); }
    function tokenURI(uint256 id) public pure override returns (string memory) {
        return string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg"><circle r="8" stroke-opacity=".5"/>',
            '<text>', id.toString(), '</text></svg>'
        ))));
    }
}`);
const copiedSvg = svgSource.replace(/^ +/gm, spaces => "\u200f" + "\u00a0".repeat(spaces.length));
const packedData = solidity(`
import "@openzeppelin/contracts@5.0.2/utils/Base64.sol";
contract PackedData {
    function pack(uint256 id) external pure returns (string memory) {
        bytes memory chunks = abi.encodePacked(
            ${Array.from({ length: 25 }, (_, index) => `"${String(index).padStart(2, "0")}abc123"`).join(", ")}
        );
        return string(abi.encodePacked(id, Base64.encode(chunks)));
    }
}`);

test("copy normalization leaves literals, their escapes, and comments untouched", () => {
  const source = '/*\n\u200f\u00a0 a comment\n*/\n' +
    '\u200f\u00a0string constant text = unicode"a\u00a0\\\"b\u200f"; //\u00a0 note\n' +
    '\u200e\u202fstring constant escaped = "a\\\n\u00a0b";\n';
  const expected = source.replace("\u200f\u00a0string", " string").replace("\u200e\u202fstring", " string");
  assert.equal(normalizeSolidityIndentation(source), expected);
});

function workerFor(version) {
  let response;
  const self = { postMessage: value => { response = value; } };
  runInNewContext(readFileSync(new URL(`worker-${version}.js`, compilerRoot), "utf8"), {
    Module: require(`../dist/compiler/soljson-${version}.js`), self,
  });
  return input => {
    self.onmessage({ data: input });
    if (response.error) throw new Error(response.error);
    return response;
  };
}

test("retries a real Solidity 0.8.24 stack-depth failure without changing the source or dropping optimizer settings", async () => {
  const run = workerFor("0.8.24");
  const build = getCompilerBuild("0.8.24");
  const attempts = [];
  const compile = source => compileSolidity(source, "PackedData", bundled, input => {
    attempts.push(input.settings.viaIR);
    return run(input);
  }, [], build);
  const artifact = await compile(packedData);
  assert.equal(attempts.at(-1), true);
  assert.equal(attempts.filter(value => value === true).length, 1);
  assert.ok(attempts.slice(0, -1).every(value => value === undefined));
  assert.deepEqual(artifact.input.settings.optimizer, { runs: 200, enabled: true });
  assert.equal(artifact.input.settings.evmVersion, "paris");
  assert.equal(artifact.input.settings.viaIR, true);
  assert.equal(artifact.metadata.settings.viaIR, true);
  assert.equal(artifact.input.sources["Custom.sol"].content, packedData);
  assert.ok(artifact.input.sources["@openzeppelin/contracts/utils/Base64.sol"]);
  assert.ok(artifact.abi.some(item => item.name === "pack"));
  assert.match(artifact.bytecode, /^0x[a-f\d]+$/i);

  attempts.length = 0;
  const explicitSettings = JSON.stringify({
    language: "Solidity",
    sources: { "Custom.sol": { content: packedData } },
    settings: { viaIR: false },
  });
  await assert.rejects(compile(explicitSettings), /Stack too deep/);
  assert.ok(attempts.length > 0 && attempts.every(value => value === false));
});

test("a failed stack-depth retry stops, and syntax errors do not trigger a retry", async () => {
  const build = getCompilerBuild("0.8.24");
  const attempts = [];
  const check = (type, message) => compileSolidity("contract Sample {}", "Sample", {}, input => {
    attempts.push(input.settings.viaIR);
    return { output: { errors: [{ severity: "error", type, message }] }, compilerVersion: build };
  }, [], build);
  await assert.rejects(check("CompilerError", "Stack too deep"), /Stack too deep/);
  assert.deepEqual(attempts, [undefined, true]);
  attempts.length = 0;
  await assert.rejects(check("ParserError", "Expected a statement"), /Expected a statement/);
  assert.deepEqual(attempts, [undefined]);
});

for (const version of ["0.8.24", "0.8.28"]) {
  test(`bundled Solidity ${version}: rejects the typo, compiles valid Strings and complex projects`, async t => {
    const run = workerFor(version);
    const build = getCompilerBuild(version);
    const compile = (source, uploads = [], name = "") => compileSolidity(source, name, bundled, run, uploads, build);
    const checkArtifact = (artifact, name, functions) => {
      assert.equal(artifact.symbol, name);
      assert.equal(artifact.compilerVersion, build);
      assert.equal(artifact.input.settings.evmVersion, "paris");
      assert.match(artifact.bytecode, /^0x[a-f\d]{200,}$/i);
      assert.match(artifact.deployedBytecode, /^0x[a-f\d]{80,}$/i);
      for (const fn of functions) assert.ok(artifact.abi.some(item => item.type === "function" && item.name === fn), fn);
    };
    await t.test("reports precise syntax hints without modifying the source", async () => {
      await assert.rejects(compile(invalidUsing), /ParserError:[\s\S]*got 'string'[\s\S]*using Strings for uint256/);
      await assert.rejects(compile(invalidType), /DeclarationError:[\s\S]*`uint256`, not `unit256`/);
      await assert.rejects(compile("", [{ path: "Custom.sol", content: invalidUsing }]), /got 'string'[\s\S]*Custom\.sol:/);
    });
    await t.test("compiles the valid Custom.sol in the editor and as the only upload", async () => {
      const starter = solidity("contract Starter {}");
      const uploads = [{ path: "Custom.sol", content: fixedUsing }];
      const pasted = await compile(fixedUsing);
      const uploaded = await compile(compilationSource(starter, uploads, starter), uploads);
      checkArtifact(pasted, "Custom", ["label"]);
      assert.equal(pasted.input.settings.viaIR, undefined);
      assert.equal(uploaded.bytecode, pasted.bytecode);
      assert.equal(uploaded.input.sources["Custom.sol"].content, fixedUsing);
    });
    await t.test("compiles escaped multilingual literals to the same runtime as valid Unicode literals", async () => {
      const phrase = "سلام دنیا 😀";
      const source = solidity(`contract Text {
        function message() external pure returns (string memory) { return "${phrase}"; }
        function joined() external pure returns (string memory) { return "Hello, " "${phrase}"; }
      }`);
      const reference = source.replace(`"${phrase}"`, `unicode"${phrase}"`)
        .replace(`"Hello, " "${phrase}"`, `unicode"Hello, ${phrase}"`);
      await assert.rejects(compile(source), /ParserError: Invalid character in string/);
      const fixed = await compile(encodeDraftLiterals(source));
      const expected = await compile(reference);
      checkArtifact(fixed, "Text", ["message", "joined"]);
      const withoutMetadata = bytecode => bytecode.slice(0, -2 * (parseInt(bytecode.slice(-4), 16) + 2));
      assert.equal(withoutMetadata(fixed.deployedBytecode), withoutMetadata(expected.deployedBytecode));
    });
    await t.test("compiles the repaired on-chain SVG NFT with chat indentation and retains the compiled source", async () => {
      const raw = run({ language: "Solidity", sources: { "Custom.sol": { content: copiedSvg } } });
      assert.ok(raw.output.errors.some(error => error.type === "ParserError"));
      const artifact = await compile(copiedSvg);
      checkArtifact(artifact, "SvgMedal", ["issue", "tokenURI"]);
      assert.equal(artifact.input.sources["Custom.sol"].content, svgSource);
      const broken = copiedSvg.replace('stroke-opacity=".5"/>\',', "stroke-");
      await assert.rejects(compile(broken), /ParserError:[\s\S]*stroke-/);
    });
    await t.test("compiles enumerable NFT, Merkle proof claims and role management", async () => {
      const withRemixImports = nft
        .replace("@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol",
          "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/token/ERC721/ERC721.sol")
        .replace("@openzeppelin/contracts@5.0.2/utils/Strings.sol",
          "https://unpkg.com/@openzeppelin/contracts@5.0.2/utils/Strings.sol")
        .replace("@openzeppelin/contracts/utils/cryptography/MerkleProof.sol",
          "https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.2/utils/cryptography/MerkleProof.sol");
      const artifact = await compile(withRemixImports);
      checkArtifact(artifact, "Editions", ["tokenURI", "claim", "hasRole", "tokenByIndex"]);
      assert.ok(artifact.input.sources["@openzeppelin/contracts/utils/Strings.sol"]);
    });
    await t.test("compiles an uploaded folder with shared types, relative paths and nested node_modules", async () => {
      const artifact = await compile("", uploadedProject);
      checkArtifact(artifact, "Custom", ["add", "read", "hasRole"]);
      assert.equal(artifact.source, "project/src/Custom.sol");
    });
    await t.test("compiles Standard JSON with an upgradeable implementation and bundled transitive imports", async () => {
      const unit = "contracts/Reserve.sol";
      const input = JSON.stringify({
        language: "Solidity", sources: { [unit]: { content: upgradeable } },
        settings: { optimizer: { runs: 321 } },
      });
      const artifact = await compile(input, [], `${unit}:UpgradeableReserve`);
      checkArtifact(artifact, "UpgradeableReserve", ["initialize", "pause", "transfer"]);
      assert.equal(artifact.input.settings.optimizer.runs, 321);
      assert.ok(artifact.input.sources["@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol"]);
    });
    await t.test("preserves pragma errors, unsupported versions and explicit selection", async () => {
      await assert.rejects(compile(`pragma solidity ${version === "0.8.24" ? "0.8.28" : "0.8.24"}; contract Incompatible {}`),
        /Source file requires different compiler version/);
      await assert.rejects(compile(fixedUsing.replace("@5.0.2", "@5.1.0")), /@5\.1\.0\/utils\/Strings\.sol" not found/);
      await assert.rejects(compile(fixedUsing.replace("@openzeppelin/contracts@5.0.2/",
        "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v5.1.0/contracts/")), /v5\.1\.0\/contracts\/utils\/Strings\.sol" not found/);
      const multiple = solidity("contract One {} contract Two {}");
      await assert.rejects(compile(multiple), /Custom\.sol:One[\s\S]*Custom\.sol:Two/);
      assert.equal((await compile(multiple, [], "Custom.sol:Two")).symbol, "Two");
    });
  });
}
