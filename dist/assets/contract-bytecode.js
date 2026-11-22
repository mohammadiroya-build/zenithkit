export function metadataTail(code) {
  if (typeof code !== "string" || !/^0x(?:[\da-f]{2})+$/i.test(code)) return null;
  const length = (Number.parseInt(code.slice(-4), 16) + 2) * 2;
  if (length < 26 || length >= code.length - 2) return null;
  const tail = code.slice(-length).toLowerCase();
  return /^[ab][\da-f]/.test(tail) ? tail : null;
}

function maskImmutables(code, references) {
  const spans = Object.values(references ?? {}).flat().sort((a, b) => b.start - a.start);
  for (const { start, length } of spans) {
    const index = 2 + start * 2;
    const size = length * 2;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) ||
        start < 0 || size < 2 || index + size > code.length) return null;
    code = code.slice(0, index) + "0".repeat(size) + code.slice(index + size);
  }
  return code;
}

export function compareRuntimeBytecode(onChain, contract) {
  const provider = "Zenith RPC";
  const actual = onChain?.toLowerCase();
  const expected = contract.deployedBytecode?.toLowerCase();
  if (!actual || actual === "0x") {
    return { state: "Not matched", provider, message: "No contract bytecode at this address" };
  }
  if (!expected || !/^0x(?:[\da-f]{2})+$/.test(expected)) {
    return { state: "Not matched", provider, message: "This build does not contain comparable runtime bytecode" };
  }
  if (actual === expected) return { state: "Bytecode matched", provider, message: "Exact runtime bytecode match" };
  const actualMetadata = metadataTail(actual);
  const expectedMetadata = metadataTail(expected);
  const actualCode = maskImmutables(actualMetadata ? actual.slice(0, -actualMetadata.length) : actual, contract.immutableReferences);
  const expectedCode = maskImmutables(expectedMetadata ? expected.slice(0, -expectedMetadata.length) : expected, contract.immutableReferences);
  if (actualCode && actualCode === expectedCode) {
    const exclusions = [];
    if (actualMetadata !== expectedMetadata) exclusions.push("compiler metadata differs");
    if (Object.keys(contract.immutableReferences ?? {}).length) exclusions.push("immutable values were not checked");
    return {
      state: "Bytecode matched",
      provider,
      message: `Runtime instructions match${exclusions.length ? `, ${exclusions.join(" and ")}` : ""}`,
    };
  }
  return { state: "Not matched", provider, message: "The compiled runtime does not match this address" };
}

export function savedVerificationRecord(records, address, contract, encoded) {
  const target = address.toLowerCase();
  let match;
  for (const record of records) {
    const part = record.parts.find(entry => entry.address?.toLowerCase() === target &&
        entry.contract?.bytecode === contract.bytecode &&
        entry.contract?.deployedBytecode === contract.deployedBytecode &&
        entry.encoded === encoded);
    if (part?.hash) return record;
    if (part && !match) match = record;
  }
  return match;
}
