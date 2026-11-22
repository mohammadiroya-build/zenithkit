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

async function confirmedDeploymentTip(client, history, gas, standardTip, deadline) {
  const oldest = wei(history?.oldestBlock);
  if (oldest === null || !Array.isArray(history?.reward) || history.reward.length > 48) return null;

  const candidates = history.reward.flatMap((row, index) => {
    const tip = wei(row?.[0]);
    return tip !== null && tip > 0n && tip < standardTip ? [oldest + BigInt(index)] : [];
  }).slice(-4);
  if (candidates.length < 2) return null;

  async function confirmedTip(number) {
    const tag = `0x${number.toString(16)}`;
    const block = await client.request({ method: "eth_getBlockByNumber", params: [tag, true] });
    const base = wei(block?.baseFeePerGas);
    if (base === null || typeof block.hash !== "string" || !Array.isArray(block.transactions) ||
        Date.now() >= deadline) return null;

    const comparableGas = (gas + 1n) / 2n;
    const creation = block.transactions.find(tx => {
      if (tx?.to !== null || typeof tx.hash !== "string" || (wei(tx.gas) ?? 0n) < comparableGas) return false;
      const total = wei(tx.gasPrice);
      const maxTip = wei(tx.maxPriorityFeePerGas);
      const maxFee = wei(tx.maxFeePerGas) ?? total;
      const available = maxFee === null ? null : maxFee - base;
      const tip = maxTip === null ? available : available !== null && available < maxTip ? available : maxTip;
      return tip !== null && tip > 0n && tip < standardTip;
    });
    if (!creation) return null;
    const receipt = await client.request({ method: "eth_getTransactionReceipt", params: [creation.hash] });
    if (receipt?.status !== "0x1" || !receipt.contractAddress ||
        receipt.blockHash !== block.hash || (wei(receipt.gasUsed) ?? 0n) < comparableGas) return null;
    const paid = wei(receipt.effectiveGasPrice);
    const tip = paid === null ? null : paid - base;
    return tip !== null && tip > 0n && tip < standardTip ? tip : null;
  }

  const results = await Promise.allSettled(candidates.map(confirmedTip));
  const confirmed = results.map(item => item.value).filter(tip => typeof tip === "bigint")
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  return confirmed[1] ?? null;
}

export async function deploymentFees(client, request) {
  const deadline = Date.now() + 3500;
  const prices = Promise.allSettled([
    within(client.request({ method: "eth_feeHistory", params: ["0x30", "latest", [25]] }), 3500),
    within(client.request({ method: "eth_maxPriorityFeePerGas" }), 3500),
    within(client.request({ method: "eth_gasPrice" }), 3500),
  ]);
  const [gas, results] = await Promise.all([client.estimateGas(request), prices]);
  const [history, priorityQuote, priceQuote] = results.map(item => item.value);
  const baseFees = history?.baseFeePerGas;
  const base = wei(baseFees?.[baseFees.length - 1]);
  const quotedTip = wei(priorityQuote);
  const gasPrice = wei(priceQuote);
  const samples = Array.isArray(history?.reward) ? history.reward.slice(-12)
    .map(row => wei(row?.[0]))
    .filter(tip => tip !== null && tip > 0n)
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0) : [];
  const lowerQuartile = samples.length >= 4 ? samples[Math.floor((samples.length - 1) / 4)] : null;
  const impliedTip = base !== null && gasPrice !== null && gasPrice >= base ? gasPrice - base : null;
  const nodeTip = quotedTip ?? impliedTip;
  let tip = lowerQuartile === null ? nodeTip :
    nodeTip !== null && nodeTip < lowerQuartile ? nodeTip : lowerQuartile;
  const gasLimit = gas + (gas + 19n) / 20n;
  if (base !== null && tip !== null && (base > 0n || tip > 0n)) {
    const budget = Math.min(1200, deadline - Date.now());
    if (tip > 0n && budget > 0) {
      const confirmed = await within(
        confirmedDeploymentTip(client, history, gas, tip, Date.now() + budget), budget,
      ).catch(() => null);
      tip = confirmed ?? tip;
    }
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
