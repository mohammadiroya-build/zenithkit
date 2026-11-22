import { collectCustomImports } from "./custom-imports.js";
import { compileSolidity } from "./solidity-compile.js";
import { getCompilerBuild } from "./compiler-versions.js";
import { abortReason, checkAbort, requestTimeout } from "./request-timeout.js";

export const customCompilerTimeout = 90_000;
const bundles = new Map();

function loadBundle(version) {
  if (bundles.has(version)) return bundles.get(version);
  const timeout = requestTimeout(30_000);
  const request = (async () => {
    const response = await fetch(new URL(`../compiler/openzeppelin-${version}.json`, import.meta.url), {
      signal: timeout.signal,
    });
    if (!response.ok) throw new Error(`Could not load the bundled OpenZeppelin ${version} sources`);
    const files = await response.json();
    if (typeof files?.["@openzeppelin/contracts/token/ERC20/ERC20.sol"] !== "string") {
      throw new Error(`Invalid bundled OpenZeppelin ${version} sources`);
    }
    return files;
  })().catch(error => {
    bundles.delete(version);
    throw error;
  }).finally(timeout.clear);
  bundles.set(version, request);
  return request;
}

function runUntilAbort(signal, start) {
  return new Promise((resolve, reject) => {
    checkAbort(signal);
    const abort = () => reject(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(start).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function runWorker(worker, input, signal) {
  return new Promise((resolve, reject) => {
    checkAbort(signal);
    function finish(error, result) {
      signal.removeEventListener("abort", abort);
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      if (error) reject(error);
      else resolve(result);
    }
    const abort = () => finish(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data);
    worker.onerror = () => finish(new Error("Could not load the browser compiler"));
    worker.onmessageerror = () => finish(new Error("Could not read the browser compiler response"));
    try {
      worker.postMessage(input);
    } catch (error) {
      finish(error);
    }
  });
}

export async function compileCustomSolidity(source, name, uploads, parent, version, createWorker, release = "") {
  const expected = getCompilerBuild(version);
  const timeout = requestTimeout(customCompilerTimeout, parent);
  const signal = timeout.signal;
  let owned;
  try {
    checkAbort(signal);
    owned = await createWorker(signal, version);
    checkAbort(signal);
    const ready = runWorker(owned.worker, { prepare: true }, signal).then(result => {
      if (!result.prepared) throw new Error("Unexpected compiler preparation response");
    });
    ready.catch(() => {});
    const prepareImports = (sources, remappings) => collectCustomImports(sources, remappings,
      version => runUntilAbort(signal, () => loadBundle(version)), release);
    return await compileSolidity(source, name, {}, async input => {
      await ready;
      return runWorker(owned.worker, input, signal);
    }, uploads, expected, prepareImports);
  } catch (error) {
    if (timeout.expired) throw new Error("Compilation timed out");
    throw error;
  } finally {
    timeout.clear();
    if (owned) {
      owned.worker.onmessage = owned.worker.onerror = owned.worker.onmessageerror = null;
      owned.worker.terminate();
      owned.release();
    }
  }
}
