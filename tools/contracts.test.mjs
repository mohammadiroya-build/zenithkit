import assert from "node:assert/strict";
import { test } from "node:test";
import { compareRuntimeBytecode } from "../dist/assets/contract-bytecode.js";
import { deploymentFees, feePaid, formatZthFee } from "../dist/assets/contract-fees.js";
import { matchStorageRequest } from "../dist/assets/request-storage.js";
import worker from "../workers/contracts.mjs";

const validSource = "// SPDX-License-Identifier: MIT\npragma solidity 0.8.20;\ncontract Demo {}\n";
const path = "https://zenithkit.example/api/contracts/draft";
const allow = { limit: async () => ({ success: true }) };
const env = run => ({
  AI: { run },
  CONTRACT_DRAFT_LIMIT: allow,
  CONTRACT_DRAFT_SHARED_LIMIT: allow,
});
const post = (body, headers = {}) => new Request(path, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("worker forwards the unchanged original request in one model call", async () => {
  const original = "Cree un registro con un nombre fijo";
  let calls = 0;
  const res = await worker.fetch(post({ prompt: original, language: "es" }), env(async (model, input) => {
    calls++;
    assert.equal(model, "@cf/google/gemma-4-26b-a4b-it");
    assert.deepEqual(JSON.parse(input.messages[1].content), { request: original, language_hint: "es" });
    return { choices: [{ message: { content: `\`\`\`solidity\n${validSource}\`\`\`` }, finish_reason: "stop" }] };
  }));
  assert.equal(calls, 1);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { source: validSource });
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
  assert.equal(matchStorageRequest("Create a contract that stores a number").name, "NumberStore");
  assert.equal(matchStorageRequest("Create a contract that stores a number for owners only"), null);
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

test("runtime comparison distinguishes on-chain match and mismatches", () => {
  const contract = { deployedBytecode: "0x60005b6000", immutableReferences: { slot: [{ start: 3, length: 1 }] } };
  assert.equal(compareRuntimeBytecode("0x", contract).state, "Not matched");
  assert.equal(compareRuntimeBytecode(contract.deployedBytecode, contract).message, "Exact runtime bytecode match");
  const matched = compareRuntimeBytecode("0x60005b4400", contract);
  assert.equal(matched.state, "Bytecode matched");
  assert.match(matched.message, /immutable values were not checked/);
  assert.equal(compareRuntimeBytecode("0x60005c4400", contract).state, "Not matched");
});
