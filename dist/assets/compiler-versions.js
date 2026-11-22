export const compilerBuilds = Object.freeze({
  "0.8.28": "0.8.28+commit.7893614a",
  "0.8.24": "0.8.24+commit.e11b9ed9",
});

export function getCompilerBuild(version) {
  if (!Object.prototype.hasOwnProperty.call(compilerBuilds, version)) {
    throw new Error("Select a supported Solidity compiler version");
  }
  return compilerBuilds[version];
}
