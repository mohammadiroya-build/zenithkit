function wei(value) {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  return typeof value === "string" && /^0x[\da-f]+$/i.test(value) ? BigInt(value) : null;
}

async function within(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Network fee quote timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function deploymentFees(client, request) {
  const prices = Promise.allSettled([
    within(client.request({ method: "eth_feeHistory", params: ["0xc", "latest", [25]] }), 3500),
    within(client.request({ method: "eth_maxPriorityFeePerGas" }), 3500),
    within(client.request({ method: "eth_gasPrice" }), 3500),
  ]);
  const [gas, results] = await Promise.all([client.estimateGas(request), prices]);
  const [history, priorityQuote, priceQuote] = results.map(item => item.value);
  const base = wei(history?.baseFeePerGas?.at(-1));
  const quotedTip = wei(priorityQuote);
  const gasPrice = wei(priceQuote);
  const samples = Array.isArray(history?.reward) ? history.reward
    .map(row => wei(row?.[0]))
    .filter(tip => tip !== null && tip > 0n)
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0) : [];
  const lowerQuartile = samples.length >= 4 ? samples[Math.floor((samples.length - 1) / 4)] : null;
  const impliedTip = base !== null && gasPrice !== null && gasPrice >= base ? gasPrice - base : null;
  const nodeTip = quotedTip ?? impliedTip;
  const tip = lowerQuartile === null ? nodeTip :
    nodeTip !== null && nodeTip < lowerQuartile ? nodeTip : lowerQuartile;
  const gasLimit = gas + (gas + 19n) / 20n;
  if (base !== null && tip !== null && (base > 0n || tip > 0n)) {
    return { gas: gasLimit, maxPriorityFeePerGas: tip, maxFeePerGas: base * 2n + tip };
  }
  return gasPrice ? { gas: gasLimit, gasPrice } : { gas: gasLimit };
}

export function feePaid(receipt) {
  return typeof receipt?.gasUsed === "bigint" && typeof receipt?.effectiveGasPrice === "bigint"
    ? (receipt.gasUsed * receipt.effectiveGasPrice).toString()
    : null;
}

export function formatZthFee(raw) {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const amount = BigInt(raw);
  const precision = 10n ** 18n;
  const fraction = (amount % precision).toString().padStart(18, "0").replace(/0+$/, "");
  return `${amount / precision}${fraction ? `.${fraction}` : ""} ZTH`;
}
