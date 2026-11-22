import assert from "node:assert/strict";
import { test } from "node:test";
import { compareRuntimeBytecode, savedVerificationRecord } from "../dist/assets/contract-bytecode.js";
import { deploymentFees, feePaid, formatZthFee } from "../dist/assets/contract-fees.js";
import { matchStorageRequest } from "../dist/assets/request-storage.js";
import { deploymentValue, initializerFor, readAssistantDeployment } from "../dist/assets/assistant-deployment-plan.js";
import { checkAbort, requestTimeout } from "../dist/assets/request-timeout.js";
import { importRemappings, solidityImportResolver } from "../dist/assets/solidity-imports.js";
import { formatWalletBalance } from "../dist/assets/wallet-balance.js";
import worker from "../workers/contracts.mjs";

test("wallet balance distinguishes zero from dust and retains exact wei", () => {
  assert.deepEqual(formatWalletBalance(0n), { text: "0 ZTH", exact: "0 ZTH" });
  assert.deepEqual(formatWalletBalance(1n), { text: "<0.00001 ZTH", exact: "0.000000000000000001 ZTH" });
  assert.deepEqual(formatWalletBalance(9_999_999_999_999n), {
    text: "<0.00001 ZTH", exact: "0.000009999999999999 ZTH",
  });
  assert.deepEqual(formatWalletBalance(10_000_000_000_000n), { text: "0.00001 ZTH", exact: "0.00001 ZTH" });
});

test("wallet balance groups and rounds without converting wei to a floating-point number", () => {
  assert.deepEqual(formatWalletBalance(9_007_199_254_740_993_123_456_789_012_345_678n), {
    text: "9,007,199,254,740,993.12346 ZTH", exact: "9,007,199,254,740,993.123456789012345678 ZTH",
  });
  assert.deepEqual(formatWalletBalance(999_999_999_999_999_999n), {
    text: "1 ZTH", exact: "0.999999999999999999 ZTH",
  });
});

const validSource = "// SPDX-License-Identifier: MIT\npragma solidity 0.8.28;\ncontract Demo {}\n";
const path = "https://app.example/api/contracts/draft";
const allow = { limit: async () => ({ success: true }) };
const env = run => ({
  AI: { run },
  CONTRACT_DRAFT_LIMIT: allow,
  CONTRACT_DRAFT_SHARED_LIMIT: allow,
});
const post = (body, headers = {}) => new Request(path, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ compilerVersion: "0.8.28", ...body }),
});

test("worker forwards the unchanged original request in one model call", async () => {
  const original = "Cree un registro con un nombre fijo";
  let calls = 0;
  const res = await worker.fetch(post({ prompt: original, language: "es" }), env(async (model, input) => {
    calls++;
    assert.equal(model, "@cf/google/gemma-4-26b-a4b-it");
    assert.equal(input.chat_template_kwargs.enable_thinking, false);
    assert.match(input.messages[0].content, /No Markdown, prose, NatSpec or nonessential comments/);
    assert.match(input.messages[0].content, /do not omit requested features/);
    assert.match(input.messages[0].content, /Never use reserved Solidity words as identifiers/);
    assert.match(input.messages[0].content, /Use normal constructors by default/);
    assert.deepEqual(JSON.parse(input.messages[1].content), { request: original, language_hint: "es" });
    return { choices: [{ message: { content: `\`\`\`solidity\n${validSource}\`\`\`` }, finish_reason: "stop" }] };
  }));
  assert.equal(calls, 1);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { source: validSource });
});

for (const compilerVersion of ["0.8.28", "0.8.24"]) {
  test(`worker requests the selected Solidity ${compilerVersion} for drafting and repair`, async () => {
    const source = validSource.replace("0.8.28", compilerVersion);
    const prompt = "Store a single number";
    for (const repair of [false, true]) {
      const diagnostic = "ParserError: example";
      const body = { prompt, compilerVersion, ...(repair ? { source, diagnostic } : {}) };
      const response = await worker.fetch(post(body), env(async (_, input) => {
        assert.ok(input.messages[0].content.includes(`pragma solidity ${compilerVersion};`));
        assert.deepEqual(JSON.parse(input.messages[1].content), {
          request: prompt,
          ...(repair ? { previous_source: source, compiler_error: diagnostic } : {}),
        });
        return { response: source };
      }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { source });
    }
  });
}

test("worker rejects an unsupported compiler or a draft for the wrong compiler", async () => {
  assert.equal((await worker.fetch(post({ prompt: "Store a number", compilerVersion: undefined }), {})).status, 400);
  assert.equal((await worker.fetch(post({ prompt: "Store a number", compilerVersion: "0.8.99" }), {})).status, 400);
  const response = await worker.fetch(
    post({ prompt: "Store a number", compilerVersion: "0.8.24" }),
    env(async () => ({ response: validSource })),
  );
  assert.equal(response.status, 502);
});

test("worker extracts a wrapped completion with a compatible pragma and no extraneous text", async () => {
  const body = validSource.replace("0.8.28", "^0.8.28");
  const response = await worker.fetch(post({ prompt: "Create a registry" }), env(async () => ({
    result: { choices: [{ finish_reason: "stop", message: { content: [
      { type: "text", text: `<think>internal</think>\n\`\`\`solidity\n${body}\`\`\`` },
    ] } }] },
  })));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { source: body });
});

test("worker routes, strips malformed completions, and enforces rate limits", async () => {
  const configured = env(async () => ({ choices: [{ finish_reason: "length", message: { content: validSource } }] }));
  assert.equal((await worker.fetch(new Request(path), configured)).status, 405);
  assert.equal((await worker.fetch(new Request(`${path}/unknown`), configured)).status, 404);
  assert.equal((await worker.fetch(post({ prompt: "x", source: validSource }), configured)).status, 400);
  assert.equal((await worker.fetch(post({ prompt: "x" }, { Origin: "https://other.example" }), configured)).status, 403);
  assert.equal((await worker.fetch(post({ prompt: "x" }), {})).status, 503);
  assert.equal((await worker.fetch(post({ prompt: "x" }), configured)).status, 502);
  assert.equal((await worker.fetch(post({ prompt: "x" }), {
    ...configured,
    CONTRACT_DRAFT_SHARED_LIMIT: { limit: async () => ({ success: false }) },
  })).status, 429);
});

test("quick storage does not drop extra requirements", () => {
  for (const version of ["0.8.28", "0.8.24"]) {
    const result = matchStorageRequest("Create a contract that stores a number", version);
    assert.equal(result.name, "NumberStore");
    assert.ok(result.source.includes(`pragma solidity ${version};`));
    assert.equal(matchStorageRequest("Create a contract that stores a number for owners only", version), null);
  }
});

test("the timeout preserves cancellation and can be cleared before it expires", async () => {
  const parent = new AbortController();
  const timed = requestTimeout(25_000, parent.signal);
  parent.abort();
  assert.throws(() => checkAbort(timed.signal), { name: "AbortError" });
  assert.equal(timed.expired, false);
  const cleared = requestTimeout(0);
  cleared.clear();
  const expired = requestTimeout(0);
  await new Promise((resolve) => expired.signal.addEventListener("abort", resolve, { once: true }));
  assert.equal(cleared.signal.aborted, false);
  assert.equal(expired.expired, true);
  assert.throws(() => checkAbort(expired.signal), { name: "TimeoutError" });
});

test("imports resolve pinned dependencies and uploads without substituting another version", () => {
  const pkg = "@openzeppelin/contracts";
  const sources = {
    "Main.sol": { content: `import "${pkg}@5.0.2/utils/Math.sol";\nimport "node_modules/${pkg}/utils/Math.sol";` },
    "project/node_modules/vendor/Hash.sol": { content: "uploaded" },
    "workspace/lib/Shared.sol": { content: "local" },
  };
  const bundled = { [`${pkg}/utils/Math.sol`]: "official" };
  const resolve = solidityImportResolver(sources, bundled);
  assert.equal(resolve(`${pkg}@5.0.2/utils/Math.sol`).content, "official");
  assert.equal(resolve(`node_modules/${pkg}/utils/Math.sol`).content, "official");
  assert.equal(resolve(`${pkg}@4.9.0/utils/Math.sol`), undefined);
  assert.equal(resolve("vendor/Hash.sol").content, "uploaded");
  assert.equal(resolve("lib/Shared.sol").content, "local");
  assert.equal(resolve("Missing.sol"), undefined);
  const explicit = `${pkg}@5.0.2/=vendor/`;
  const rules = importRemappings([explicit], sources, bundled);
  assert.ok(rules.includes(explicit));
  assert.ok(!rules.includes(`${pkg}@5.0.2/=${pkg}/`));
  assert.ok(rules.includes(`node_modules/${pkg}/=${pkg}/`));
  assert.equal(importRemappings(undefined, { "Main.sol": { content: "contract Main {}" } }, bundled), undefined);
});

test("gas limit and fee quote favor recent valid lower tips with full price cap", async () => {
  const request = { data: "0x1234", value: 7n };
  const fees = await deploymentFees({
    estimateGas: async input => { assert.equal(input, request); return 100_001n; },
    request: async ({ method }) => ({
      eth_feeHistory: { baseFeePerGas: ["0x8", "0xa"], reward: [["0x0"], ["0xa"], ["0x10"], ["0x20"], ["0x40"]] },
      eth_maxPriorityFeePerGas: "0x40",
      eth_gasPrice: "0x4a",
    })[method],
  }, request);
  assert.deepEqual(fees, { gas: 105_002n, maxPriorityFeePerGas: 10n, maxFeePerGas: 30n });
  assert.equal(formatZthFee(feePaid({ gasUsed: 240_000n, effectiveGasPrice: 10_000_000_000n })), "0.0024 ZTH");
});

test("gas quote falls back to RPC legacy price or wallet without inventing fees", async () => {
  const client = { estimateGas: async () => 21_000n, request: async ({ method }) => {
    if (method !== "eth_gasPrice") throw new Error("Method unavailable");
    return "0x75";
  } };
  assert.deepEqual(await deploymentFees(client, {}), { gas: 22_050n, gasPrice: 117n });
  client.request = async () => { throw new Error("Unavailable"); };
  assert.deepEqual(await deploymentFees(client, {}), { gas: 22_050n });
  client.estimateGas = async () => { throw new Error("Deployment would revert"); };
  await assert.rejects(deploymentFees(client, {}), /would revert/);
});

function recentDeploymentFeesFixture({ second = "success" } = {}) {
  const calls = [];
  const client = {
    estimateGas: async () => 200_000n,
    request: async ({ method, params = [] }) => {
      calls.push([method, params]);
      if (method === "eth_feeHistory") return {
        oldestBlock: "0x100",
        baseFeePerGas: ["0x7", "0x7"],
        reward: Array.from({ length: 48 }, (_, index) => [index === 27 || index === 46 ? "0xa" : "0x1f4"]),
      };
      if (method === "eth_gasPrice") return "0x1fb";
      if (method === "eth_maxPriorityFeePerGas") return "0x1f4";
      if (method === "eth_getBlockByNumber") {
        const [number, full] = params;
        assert.equal(full, true);
        return {
          hash: `block:${number}`, baseFeePerGas: "0x7",
          transactions: [{
            hash: number, to: number === "0x12e" && second === "transfer" ? "0x1234" : null,
            gas: "0x30d40", maxPriorityFeePerGas: "0x32", maxFeePerGas: "0x11",
          }],
        };
      }
      if (method === "eth_getTransactionReceipt") {
        const [number] = params;
        if (number === "0x12e" && second === "unavailable") throw new Error("Unavailable");
        return {
          status: number === "0x12e" && second === "reverted" ? "0x0" : "0x1",
          contractAddress: "0x1234", blockHash: `block:${number}`,
          gasUsed: number === "0x12e" && second === "small" ? "0xd088" : "0x30d40",
          effectiveGasPrice: number === "0x11b" ? "0xe" : "0xf",
        };
      }
      throw new Error(`Unexpected request: ${method}`);
    },
  };
  return { client, calls };
}

test("a cheaper deployment tip requires successful comparable creations in distinct recent blocks", async () => {
  const { client, calls } = recentDeploymentFeesFixture();
  assert.deepEqual(await deploymentFees(client, {}), {
    gas: 210_000n, maxPriorityFeePerGas: 8n, maxFeePerGas: 22n,
  });
  assert.deepEqual(calls.filter(([method]) => method === "eth_getBlockByNumber").map(([, args]) => args[0]), ["0x11b", "0x12e"]);
});

test("a transfer, a revert, a small creation or missing data cannot reduce the standard quote", async () => {
  for (const second of ["transfer", "reverted", "small", "unavailable"]) {
    const { client } = recentDeploymentFeesFixture({ second });
    assert.deepEqual(await deploymentFees(client, {}), {
      gas: 210_000n, maxPriorityFeePerGas: 500n, maxFeePerGas: 514n,
    });
  }
});

test("runtime comparison distinguishes on-chain match and mismatches", () => {
  const contract = { deployedBytecode: "0x60005b6000", immutableReferences: { slot: [{ start: 3, length: 1 }] } };
  assert.equal(compareRuntimeBytecode("0x", contract).state, "Not matched");
  assert.equal(compareRuntimeBytecode(contract.deployedBytecode, contract).message, "Exact runtime bytecode match");
  const matched = compareRuntimeBytecode("0x60005b4400", contract);
  assert.equal(matched.state, "Bytecode matched");
  assert.match(matched.message, /immutable values were not checked/);
  assert.equal(compareRuntimeBytecode("0x60005c4400", contract).state, "Not matched");
});

test("rechecking saved bytecode prefers the existing transaction regardless of address casing", () => {
  const address = `0x${"aB".repeat(20)}`;
  const contract = { bytecode: "0x60006000", deployedBytecode: "0x6000" };
  const part = { address: address.toLowerCase(), contract, encoded: "0x01" };
  const verifyOnly = { parts: [{ ...part, hash: null }] };
  const deployed = { parts: [{ ...part, hash: "0x1234" }] };
  assert.equal(savedVerificationRecord([verifyOnly, deployed], address, contract, "0x01"), deployed);
  assert.equal(savedVerificationRecord([verifyOnly], address, contract, "0x01"), verifyOnly);
  assert.equal(savedVerificationRecord([deployed], address, contract, "0x02"), undefined);
  assert.equal(savedVerificationRecord([deployed], address, { ...contract, bytecode: "0x6001" }, "0x01"), undefined);
});

test("assistant requires a unique state-changing initializer and validates payable amounts", () => {
  const initialize = { name: "initialize", type: "function", stateMutability: "payable" };
  assert.equal(initializerFor({ abi: [initialize] }, " initialize "), initialize);
  assert.equal(initializerFor({ abi: [] }, "initialize"), null);
  assert.equal(initializerFor({ abi: [initialize, initialize] }, "initialize"), null);
  assert.equal(initializerFor({ abi: [{ ...initialize, stateMutability: "view" }] }, "initialize"), null);
  const parse = value => BigInt(value === "0.25" ? 25 : value);
  assert.equal(deploymentValue(" ", false, "initializer", parse), 0n);
  assert.equal(deploymentValue("0.25", true, "initializer", parse), 25n);
  assert.throws(() => deploymentValue("0.25", false, "initializer", parse), /does not accept ZTH/);
  assert.throws(() => deploymentValue("0.1234567890123456789", true, "initializer", parse), /up to 18 decimals/);
});

test("assistant retains legacy transactions and resumes a confirmed implementation without a transaction", () => {
  const hash = "0x" + "ab".repeat(32);
  const account = "0x" + "ab".repeat(20);
  const address = "0x" + "cd".repeat(20);
  const contract = { abi: [] };
  const transaction = { hash, account, contract, encoded: "0x" };
  const proxy = { data: "0x12345678", value: "0" };
  const implementation = { address, owner: account, parts: [{ hash, address, contract }] };
  assert.deepEqual(readAssistantDeployment(transaction), { transaction, verify: false, proxy: null });
  const pending = { transaction: null, proxy, implementation, verify: true };
  assert.deepEqual(readAssistantDeployment({ version: 2, ...pending }), pending);
  assert.equal(readAssistantDeployment({ version: 2, ...pending, proxy: null }), null);
  assert.equal(readAssistantDeployment({ version: 2, ...pending, transaction: { ...transaction, account: address } }), null);
});
