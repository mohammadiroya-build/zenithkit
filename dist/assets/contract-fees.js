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

const lowerQuotes = new WeakSet();
let standardUntil = 0;
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const positive = n => n !== null && n > 0n;
const paddedGas = gas => gas + (gas + 19n) / 20n;
const gasCap = (base, tip) => base * 2n + tip;

function nextBaseFee(history) {
  const baseFees = history?.baseFeePerGas;
  return Array.isArray(baseFees) ? wei(baseFees[baseFees.length - 1]) : null;
}

async function feeHistory(client, deadline) {
  const read = (count, percentiles, budget) => within(
    client.request({ method: "eth_feeHistory", params: [count, "latest", percentiles] }), budget,
  );
  if (Date.now() >= standardUntil) {
    const history = await read("0x400", [10, 25], 1750).catch(() => null);
    if (nextBaseFee(history) !== null) return { history, expanded: true };
  }
  const budget = deadline - Date.now();
  const history = budget > 0 ? await read("0xc", [25], budget).catch(() => null) : null;
  return { history, expanded: false };
}

function lowerTier(history, standardTip) {
  if (!Array.isArray(history?.reward) || !Array.isArray(history.gasUsedRatio) ||
      history.gasUsedRatio.length !== history.reward.length || history.reward.length < 24) return null;
  const tail = history.gasUsedRatio.slice(-12);
  if (tail.some(fill => typeof fill !== "number" || !(fill >= 0 && fill < 0.5))) return null;
  const recent = history.reward.slice(-48).map(row => wei(row?.[0]));
  const repeated = recent.filter(tip => positive(tip) && tip < standardTip).sort(order)[2];
  return repeated !== undefined && recent.slice(-16).some(tip => positive(tip) && tip <= repeated)
    ? repeated : null;
}

async function confirmedLowerTip(client, history, head, estimatedGas, freshTip, standardTip, deadline) {
  const oldest = wei(history.oldestBlock);
  const latest = wei(head?.number);
  const blockLimit = wei(head?.gasLimit);
  const latestTime = wei(head?.timestamp);
  const historyHead = oldest === null ? null : oldest + BigInt(history.reward.length - 1);
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (oldest === null || latest === null || blockLimit === null || latestTime === null ||
      latest - historyHead > 3n || historyHead - latest > 3n ||
      now - latestTime > 300n || latestTime - now > 60n || Date.now() >= deadline ||
      paddedGas(estimatedGas) * 2n >= blockLimit) return null;

  const comparable = estimatedGas / 4n < 300_000n ? estimatedGas / 4n : 300_000n;
  const minimumGas = comparable > 100_000n ? comparable : 100_000n;
  const eligible = history.reward.flatMap((row, i) => {
    const tip = wei(row?.[0]);
    return positive(tip) && tip < standardTip && tip <= freshTip * 2n &&
      Math.round(history.gasUsedRatio[i] * Number(blockLimit)) >= Number(minimumGas)
      ? [oldest + BigInt(i)] : [];
  }).slice(-6).reverse();
  if (eligible.length < 2) return null;

  async function proof(number) {
    const tag = `0x${number.toString(16)}`;
    const block = await client.request({ method: "eth_getBlockByNumber", params: [tag, true] });
    const base = wei(block?.baseFeePerGas);
    const timestamp = wei(block?.timestamp);
    if (base === null || timestamp === null || latestTime - timestamp > 10_800n || timestamp > latestTime ||
        typeof block.hash !== "string" || !Array.isArray(block.transactions) || Date.now() >= deadline) return null;
    const creation = block.transactions.find(tx => {
      if (tx?.to !== null || typeof tx.hash !== "string" || (wei(tx.gas) ?? 0n) < minimumGas) return false;
      const cap = wei(tx.maxFeePerGas) ?? wei(tx.gasPrice);
      const maxTip = wei(tx.maxPriorityFeePerGas);
      if (cap === null || cap <= base) return false;
      const available = cap - base;
      const tip = maxTip !== null && maxTip < available ? maxTip : available;
      return tip > 0n && tip < standardTip && tip <= freshTip * 2n;
    });
    if (!creation) return null;
    const receipt = await client.request({ method: "eth_getTransactionReceipt", params: [creation.hash] });
    const paid = wei(receipt?.effectiveGasPrice);
    if (receipt?.status !== "0x1" || !receipt.contractAddress || receipt.blockHash !== block.hash ||
        (wei(receipt.gasUsed) ?? 0n) < minimumGas || paid === null || paid <= base) return null;
    const tip = paid - base;
    return tip < standardTip && tip <= freshTip * 2n ? tip : null;
  }

  const results = await Promise.allSettled(eligible.map(proof));
  const confirmed = results.map(result => result.value).filter(tip => typeof tip === "bigint").sort(order);
  if (confirmed.length < 2) return null;
  return confirmed[1] > freshTip ? confirmed[1] : freshTip;
}

export async function deploymentFees(client, request) {
  const deadline = Date.now() + 3500;
  const prices = Promise.allSettled([
    feeHistory(client, deadline),
    within(client.request({ method: "eth_maxPriorityFeePerGas" }), 3500),
    within(client.request({ method: "eth_gasPrice" }), 3500),
    within(client.request({ method: "eth_getBlockByNumber", params: ["latest", false] }), 3500),
  ]);
  const [gas, results] = await Promise.all([client.estimateGas(request), prices]);
  const [historyResult, priorityQuote, priceQuote, head] = results.map(item => item.value);
  const { history, expanded } = historyResult ?? {};
  const base = nextBaseFee(history);
  const quotedTip = wei(priorityQuote);
  const gasPrice = wei(priceQuote);
  const samples = Array.isArray(history?.reward) ? history.reward.slice(-12)
    .map(row => wei(row?.[expanded ? 1 : 0] ?? row?.[0]))
    .filter(positive)
    .sort(order) : [];
  const lowerQuartile = samples.length >= 4 ? samples[Math.floor((samples.length - 1) / 4)] : null;
  const impliedTip = base !== null && gasPrice !== null && gasPrice >= base ? gasPrice - base : null;
  const nodeTip = quotedTip ?? impliedTip;
  const useNodeQuote = Date.now() < standardUntil && positive(nodeTip);
  const tip = useNodeQuote || lowerQuartile === null ? nodeTip :
    nodeTip !== null && nodeTip < lowerQuartile ? nodeTip : lowerQuartile;
  const gasLimit = paddedGas(gas);
  if (base !== null && tip !== null && (base > 0n || tip > 0n)) {
    const standard = { gas: gasLimit, maxPriorityFeePerGas: tip, maxFeePerGas: gasCap(base, tip) };
    const fresh = expanded && Date.now() >= standardUntil && positive(tip) ? lowerTier(history, tip) : null;
    const budget = deadline - Date.now();
    if (fresh === null || budget <= 0) return standard;
    return within((async () => {
      const expires = Date.now() + budget;
      const tip = await confirmedLowerTip(client, history, head, gas, fresh, standard.maxPriorityFeePerGas, expires);
      if (tip === null || Date.now() >= expires) return standard;
      const lower = { maxPriorityFeePerGas: tip, maxFeePerGas: gasCap(base, tip) };
      const checked = await client.estimateGas({ ...request, ...lower });
      const limit = paddedGas(checked);
      if (checked <= 0n || limit > (wei(head?.gasLimit) ?? 0n) ||
          limit * lower.maxFeePerGas >= standard.gas * standard.maxFeePerGas)
        return standard;
      const quote = { gas: limit, ...lower };
      lowerQuotes.add(quote);
      return quote;
    })(), budget).catch(() => standard);
  }
  return gasPrice ? { gas: gasLimit, gasPrice } : { gas: gasLimit };
}

export async function submitWithDeploymentFees(quote, send) {
  try {
    return await send();
  } catch (error) {
    if (lowerQuotes.has(quote)) {
      const messages = [];
      for (let cause = error, i = 0; cause && i < 6; cause = cause.cause, i++) {
        messages.push(cause.message, cause.shortMessage, cause.details, cause.info?.error?.message, cause.error?.message);
      }
      const text = messages.join(" ");
      if (!/\b(replacement|nonce|user rejected|reject(?:ed)? the request|denied)\b/i.test(text) &&
          /\b(transaction underpriced|priority fee (?:is )?(?:too low|below)|tip too low|fee cap less than block base fee|max fee per gas less than block base fee|gas price too low)\b/i.test(text)) {
        standardUntil = Date.now() + 600_000;
        throw new Error("The network rejected the lower fee. Check your wallet activity before retrying. The next attempt uses the standard quote.", { cause: error });
      }
    }
    throw error;
  }
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
