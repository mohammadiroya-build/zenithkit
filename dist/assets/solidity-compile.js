import { importRemappings, solidityImportResolver } from "./solidity-imports.js";

export const sourceLimits = { files: 512, fileBytes: 500_000, totalBytes: 5_000_000 };
const editorUnit = "Custom.sol";
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const artifactOutputs = ["abi", "metadata", "evm.bytecode", "evm.deployedBytecode"];

export function compilationSource(source, files, starter) {
  return files.length && source === starter ? "" : source;
}

export function normalizeSolidityIndentation(source) {
  if (!/[\u00a0\u202f\u200e\u200f]/.test(source)) return source;
  return source.replace(
    /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))|"(?:\\[\s\S]|[^"\\\r\n])*"?|'(?:\\[\s\S]|[^'\\\r\n])*'?|^[ \t\u00a0\u202f\u200e\u200f]+/gm,
    token => /^[ \t\u00a0\u202f\u200e\u200f]+$/.test(token) ?
      token.replace(/[\u00a0\u202f]/g, " ").replace(/[\u200e\u200f]/g, "") : token,
  );
}

function uploadPath(path) {
  const name = path.trim().replace(/^(?:\.\/)+/, "");
  if (name.length > 512 || !name.endsWith(".sol") || /[\\:\u0000-\u001f\u007f]/.test(name) ||
      name.split("/").some(part => !part || part === ".." || part === ".")) {
    throw new Error(`Use a relative Solidity import path for "${path}"`);
  }
  return name;
}

function diagnostics(errors, sources) {
  return errors.map(error => {
    const message = error.formattedMessage ?? error.message;
    const location = error.sourceLocation;
    const content = location && sources[location.file]?.content;
    if (typeof content !== "string" || location.start < 0) return message;
    const bytes = encoder.encode(content);
    const before = decoder.decode(bytes.subarray(0, location.start));
    const token = decoder.decode(bytes.subarray(location.start, location.end));
    const after = decoder.decode(bytes.subarray(location.end));
    if (error.errorCode === "2314" && token === "string" && /\busing\s*$/.test(before) && /^\s+for\b/.test(after)) {
      return `${message}\nThe left side of \`using ... for ...\` needs a library name or a list of functions. For OpenZeppelin number-to-string conversion, import {Strings} from "@openzeppelin/contracts/utils/Strings.sol"; then write \`using Strings for uint256;\`.`;
    }
    if (error.errorCode === "7920" && token === "unit256" && /\busing\s+[^;{}]+\bfor\s*$/.test(before)) {
      return `${message}\nThe built-in unsigned integer type is \`uint256\`, not \`unit256\`.`;
    }
    return message;
  }).join("\n");
}

function selectContract(output, units, requested) {
  const split = requested.lastIndexOf(":");
  const targetUnit = split < 0 ? "" : requested.slice(0, split);
  const targetName = requested.slice(split + 1);
  const candidates = units.flatMap(unit => {
    if (targetUnit && unit !== targetUnit) return [];
    const nodes = output.sources?.[unit]?.ast?.nodes ?? [];
    const libraries = new Set(nodes.filter(node => node.contractKind === "library").map(node => node.name));
    return Object.entries(output.contracts?.[unit] ?? {})
      .filter(([name, contract]) => (!targetName || name === targetName) &&
        (requested || !libraries.has(name)) && contract.evm?.bytecode?.object)
      .map(([name]) => [unit, name]);
  });
  if (candidates.length === 1) return candidates[0];
  if (!candidates.length) {
    throw new Error(targetName ? `No deployable contract named ${requested}` : "No deployable contract found in the supplied sources");
  }
  const options = candidates.slice(0, 6).map(([unit, name]) => `${unit}:${name}`);
  throw new Error(`Enter path:ContractName to select one contract:\n${options.join("\n")}${candidates.length > options.length ? "\n..." : ""}`);
}

export async function compileSolidity(source, requested, bundled, run, uploads, expectedBuild) {
  const hasEditor = !!source.trim();
  if ((!hasEditor && !uploads.length) || encoder.encode(source).length > sourceLimits.fileBytes) {
    throw new Error("Enter Solidity source up to 500 KB or upload Solidity files");
  }
  const standard = source.trimStart().startsWith("{") ? JSON.parse(source) : null;
  if (standard && (standard.language !== "Solidity" || !isObject(standard.sources) ||
      !Object.keys(standard.sources).length || Object.values(standard.sources).some(file => !isObject(file) ||
        typeof file.content !== "string") || (standard.settings !== undefined && !isObject(standard.settings)))) {
    throw new Error("Use Solidity Standard JSON with embedded source content");
  }
  const sources = Object.create(null);
  for (const [path, file] of Object.entries(standard?.sources ?? (hasEditor ? {
    [editorUnit]: { content: source },
  } : {}))) {
    sources[path] = owns(file, "keccak256") ? file : { ...file, content: normalizeSolidityIndentation(file.content) };
  }
  const editorUnits = Object.keys(sources);
  if (editorUnits.length + uploads.length > sourceLimits.files + 1) {
    throw new Error("Use no more than 512 imported Solidity files");
  }
  let uploadedBytes = 0;
  for (const file of uploads) {
    const path = uploadPath(file.path);
    if (owns(sources, path)) throw new Error(`Duplicate source path: ${path}`);
    const size = encoder.encode(file.content).length;
    uploadedBytes += size;
    if (size > sourceLimits.fileBytes || uploadedBytes > sourceLimits.totalBytes) {
      throw new Error("Imports are limited to 500 KB per file and 5 MB total");
    }
    sources[path] = { content: normalizeSolidityIndentation(file.content) };
  }
  const suppliedUnits = Object.keys(sources);
  const candidates = (requested || !editorUnits.length) ? suppliedUnits : editorUnits;
  const resolveImport = solidityImportResolver(sources, bundled);
  const settings = { ...standard?.settings };
  if (settings.optimizer !== undefined && !isObject(settings.optimizer)) {
    throw new Error("Use a Solidity optimizer settings object");
  }
  const remappings = importRemappings(settings.remappings, sources, bundled);
  if (remappings !== undefined) settings.remappings = remappings;
  const outputSelection = { __proto__: null, "*": { "*": artifactOutputs } };
  if (!requested) {
    for (const unit of candidates) outputSelection[unit] = { "": ["ast"] };
  }
  let input = {
    language: "Solidity", sources, settings: {
      ...settings, evmVersion: "paris", optimizer: { runs: 200, ...settings.optimizer, enabled: true },
      outputSelection,
    },
  };
  for (;;) {
    const { output, compilerVersion } = await run(input);
    if (compilerVersion !== expectedBuild) throw new Error(`Expected Solidity ${expectedBuild}`);
    const errors = (output.errors ?? []).filter(item => item.severity === "error");
    let added = false;
    for (const error of errors) {
      if (error.errorCode !== "6275") continue;
      const path = /^Source "([^"]+)" not found:/.exec(error.message ?? "")?.[1];
      if (!path || owns(sources, path)) continue;
      const resolved = resolveImport(path);
      if (!resolved) continue;
      if (Object.keys(sources).length >= sourceLimits.files + 1 + Object.keys(bundled).length) {
        throw new Error("Too many resolved Solidity imports");
      }
      sources[path] = resolved;
      added = true;
    }
    if (added) continue;
    if (input.settings.viaIR === undefined && errors.length && errors.every(error =>
      error.type === "CompilerError" && /\bStack too deep\b/.test(error.message ?? error.formattedMessage ?? ""))) {
      input = { ...input, settings: { ...input.settings, viaIR: true } };
      continue;
    }
    if (errors.length) throw new Error(diagnostics(errors, sources));
    const [unit, name] = selectContract(output, candidates, requested);
    const contract = output.contracts[unit][name];
    if (!/^[a-f\d]+$/i.test(contract.evm.bytecode.object)) {
      throw new Error("Link external libraries before deployment");
    }
    const metadata = JSON.parse(contract.metadata);
    const usedSources = Object.fromEntries(Object.keys(metadata.sources).map(path => [path, sources[path]]));
    return {
      source: unit,
      symbol: name,
      compilerVersion,
      abi: contract.abi,
      bytecode: `0x${contract.evm.bytecode.object}`,
      deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
      immutableReferences: contract.evm.deployedBytecode.immutableReferences ?? {},
      input: { ...input, sources: usedSources, settings: { ...input.settings, outputSelection: { "*": { "*": artifactOutputs } } } },
      metadata,
      warnings: (output.errors ?? []).filter(item => item.severity === "warning").map(item => item.formattedMessage),
    };
  }
}
