import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const base = new URL("../dist/", import.meta.url);
const artifactDirectory = new URL("artifacts/", base);
const compilers = new Map();
for (const url of [new URL("compiler/soljson-0.8.20.js", base), ...process.argv.slice(2).map(pathToFileURL)]) {
  const soljson = readFileSync(url, "utf8");
  const compiler = vm.runInNewContext(`${soljson}\nModule`, {
    process,
    require: undefined,
    __dirname: "",
    console,
    TextDecoder,
    TextEncoder,
    WebAssembly,
  });
  const run = compiler.cwrap("solidity_compile", "string", ["string", "number", "number"]);
  const reset = compiler.cwrap("solidity_reset", null, []);
  const version = compiler.cwrap("solidity_version", "string", [])().split(".Emscripten")[0];
  compilers.set(version, { run, reset });
}

function compile(artifact, runs) {
  const compiler = compilers.get(artifact.compilerVersion);
  assert.ok(compiler, `Pass the soljson.js file for Solidity ${artifact.compilerVersion} as an argument`);
  const input = {
    ...artifact.input,
    settings: {
      ...artifact.input.settings,
      optimizer: { ...artifact.input.settings.optimizer, enabled: true, runs },
    },
  };
  const result = JSON.parse(compiler.run(JSON.stringify(input), 0, 0));
  compiler.reset();
  const diagnostics = result.errors?.filter(error => error.severity === "error") ?? [];
  assert.equal(diagnostics.length, 0, JSON.stringify(diagnostics));
  const output = result.contracts[artifact.source][artifact.symbol];
  assert.deepEqual(output.abi, artifact.abi);
  return {
    ...artifact,
    abi: output.abi,
    bytecode: `0x${output.evm.bytecode.object}`,
    deployedBytecode: `0x${output.evm.deployedBytecode.object}`,
    immutableReferences: output.evm.deployedBytecode.immutableReferences ?? {},
    input,
    metadata: JSON.parse(output.metadata),
  };
}

function bytecodeGas(artifact) {
  const runtimeBytes = (artifact.deployedBytecode.length - 2) / 2;
  const initCode = artifact.bytecode.slice(2).match(/../g);
  return runtimeBytes * 200 + initCode.reduce((gas, byte) => gas + (byte === "00" ? 4 : 16), 0)
    + Math.ceil(initCode.length / 32) * 2;
}

const direct = ["Greeting", "TokenBurner", "ZenithToken", "ZenithVault"];
const proxy = ["KitTransparentProxy", "ProxyAdmin"];
const artifacts = new Map([...direct, ...proxy].map(name => [
  name,
  JSON.parse(readFileSync(new URL(`${name}.json`, artifactDirectory), "utf8")),
]));
const candidates = new Map();
const baselines = new Map();
for (const [name, artifact] of artifacts) {
  const baseline = compile(artifact, artifact.input.settings.optimizer.runs);
  assert.equal(baseline.bytecode, artifact.bytecode);
  assert.equal(baseline.deployedBytecode, artifact.deployedBytecode);
  baselines.set(name, baseline);
  candidates.set(name, compile(artifact, 1));
}
const compactProxy = ["KitTransparentProxy", "ProxyAdmin"].reduce(
  (total, name) => total + bytecodeGas(candidates.get(name)) - bytecodeGas(artifacts.get(name)), 0
) < 0;
const target = new URL("deploy/", artifactDirectory);
mkdirSync(target, { recursive: true });
for (const [name, artifact] of artifacts) {
  const candidate = candidates.get(name);
  const best = (proxy.includes(name) ? compactProxy : bytecodeGas(candidate) < bytecodeGas(artifact))
    ? candidate : baselines.get(name);
  writeFileSync(new URL(`${name}.json`, target), `${JSON.stringify(best)}\n`);
  console.log(`${name}: ${artifact.input.settings.optimizer.runs} -> ${best.input.settings.optimizer.runs} runs; ${bytecodeGas(artifact) - bytecodeGas(best)} gas saved in bytecode cost model`);
}
const [proxyArtifact, proxyAdmin] = proxy.map(name => JSON.parse(readFileSync(new URL(`${name}.json`, target), "utf8")));
assert.ok(proxyArtifact.bytecode.includes(proxyAdmin.bytecode.slice(2)), "ProxyAdmin embedded in the proxy must match the verification artifact");
