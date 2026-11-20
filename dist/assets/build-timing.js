export const buildPhases = [
  ["request", "Read and check request"],
  ["translation", "Translate request"],
  ["runtime", "Load model runtime"],
  ["cacheLookup", "Check model cache"],
  ["download", "Download model"],
  ["modelInit", "Initialize model"],
  ["compilerPrep", "Prepare compiler"],
  ["draft", "Generate Solidity"],
  ["compile", "Compile Solidity"],
  ["repair", "Repair draft"],
  ["recompile", "Compile repaired draft"],
];

export const modelSources = {
  download: "Model fetched",
  disk: "Model file reused from browser storage",
  memory: "Loaded model reused from memory",
};

export function formatBuildTime(milliseconds) {
  if (milliseconds < 10) return "< 0.01 s";
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

export function untilBuildAbort(signal, task) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(task).then(value => {
      signal.removeEventListener("abort", abort);
      resolve(value);
    }, error => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
  });
}

export function createBuildTiming(clock = () => performance.now()) {
  const start = clock();
  const phases = new Map();
  function begin(name) {
    const phase = { start: clock(), finish: null };
    phases.set(name, phase);
    return () => { phase.finish ??= clock() };
  }
  return {
    begin,
    async measure(name, run) {
      const finish = begin(name);
      try { return await run() }
      finally { finish() }
    },
    finish(result, source) {
      const end = clock();
      const stages = buildPhases.flatMap(([key, label]) => {
        const phase = phases.get(key);
        return phase ? [{ key, label, ms: (phase.finish ?? end) - phase.start }] : [];
      });
      return { result, source, ms: end - start, stages };
    },
  };
}
