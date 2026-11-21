const addressPattern = /^0x[\da-f]{40}$/i;
const hashPattern = /^0x[\da-f]{64}$/i;

export function initializerFor(contract, name) {
  const candidates = contract?.abi.filter(
    entry => entry.type === "function" && entry.name === name.trim(),
  );
  if (candidates?.length !== 1 || !["nonpayable", "payable"].includes(candidates[0].stateMutability))
    return null;
  return candidates[0];
}

export function deploymentValue(input, payable, label, parseEther) {
  const text = input.trim();
  if (text && !/^\d+(?:\.\d{1,18})?$/.test(text))
    throw new Error("Enter a ZTH amount with up to 18 decimals");
  const value = text ? parseEther(text) : 0n;
  if (value && !payable) throw new Error(`This ${label} does not accept ZTH`);
  return value;
}

function isTransaction(value) {
  return typeof value?.hash === "string" && hashPattern.test(value.hash) &&
    typeof value.account === "string" && addressPattern.test(value.account) &&
    Array.isArray(value.contract?.abi) && typeof value.encoded === "string";
}

function isProxyPlan(value) {
  return /^0x[\da-f]{8}(?:[\da-f]{2})*$/i.test(value?.data ?? "") &&
    typeof value.value === "string" && /^\d+$/.test(value.value);
}

export function readAssistantDeployment(value) {
  if (isTransaction(value)) return { transaction: value, verify: false, proxy: null };
  if (value?.version !== 2) return null;
  const { transaction, proxy, implementation, verify } = value;
  const firstPart = implementation?.parts?.[0];
  if (transaction !== null && !isTransaction(transaction)) return null;
  if (proxy !== null && !isProxyPlan(proxy)) return null;
  if (implementation && (!proxy || typeof implementation.owner !== "string" ||
      !addressPattern.test(implementation.owner) || typeof implementation.address !== "string" ||
      !addressPattern.test(implementation.address) || typeof firstPart?.address !== "string" ||
      firstPart.address?.toLowerCase() !== implementation.address.toLowerCase() ||
      !Array.isArray(firstPart.contract?.abi) ||
      !hashPattern.test(firstPart.hash ?? "") ||
      (transaction && transaction.account.toLowerCase() !== implementation.owner.toLowerCase()))) return null;
  if (!transaction && !implementation) return null;
  return { transaction, proxy, implementation, verify: verify === true };
}
