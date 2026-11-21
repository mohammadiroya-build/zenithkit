export const buildPhases = [
  ["request", "Read and check request"],
  ["compilerPrep", "Prepare compiler"],
  ["draft", "Generate Solidity"],
  ["compile", "Compile Solidity"],
  ["repair", "Repair draft"],
  ["recompile", "Compile repaired draft"],
];

export function formatBuildTime(milliseconds) {
  if (milliseconds < 10) return "< 0.01 s";
  return `${(milliseconds / 1000).toFixed(2)} s`;
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
    finish(result) {
      const end = clock();
      const stages = buildPhases.flatMap(([key, label]) => {
        const phase = phases.get(key);
        return phase ? [{ key, label, ms: (phase.finish ?? end) - phase.start }] : [];
      });
      return { result, ms: end - start, stages };
    },
  };
}
