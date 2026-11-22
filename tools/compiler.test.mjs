import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { compilationSource, compileSolidity } from "../dist/assets/solidity-compile.js";
import { getCompilerBuild } from "../dist/assets/compiler-versions.js";
import { fixedUsing, invalidType, invalidUsing, nft, solidity, upgradeable, uploadedProject } from "./compiler-fixtures.mjs";

const require = createRequire(import.meta.url);
const compilerRoot = new URL("../dist/compiler/", import.meta.url);
const bundled = JSON.parse(readFileSync(new URL("openzeppelin-5.0.2.json", compilerRoot), "utf8"));

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
      assert.equal(uploaded.bytecode, pasted.bytecode);
      assert.equal(uploaded.input.sources["Custom.sol"].content, fixedUsing);
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
