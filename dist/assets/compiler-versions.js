export const compilerBuilds = Object.freeze({
  "0.8.20": "0.8.20+commit.a1b79de6",
  "0.8.24": "0.8.24+commit.e11b9ed9",
});

export function getCompilerBuild(version) {
  if (!Object.hasOwn(compilerBuilds, version)) {
    throw new Error("Select a supported Solidity compiler version");
  }
  return compilerBuilds[version];
}
