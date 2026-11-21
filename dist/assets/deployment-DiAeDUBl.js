import { a as C, b as c, p as E, e as T } from "./index-BOd0iaB5.js";
import { g as u, B as v, C as A } from "./provider-browser-LBmMibJ8.js";
import { deploymentFees, feePaid } from "./contract-fees.js";
async function D(a, t, o, r, n) {
  var p;
  const i = await a.ensureWallet(),
    e = await ((p = a.connector) == null ? void 0 : p.getProvider());
  if (!e) throw new Error("Connect a Zenith-compatible wallet");
  const h = async () => {
    if (BigInt(await e.request({ method: "eth_chainId" })) !== BigInt(c.id))
      throw new Error("Switch your wallet to Zenith EVM Testnet");
  };
  await h();
  const y = new v(e, { name: c.name, chainId: c.id }),
    s = u(i.account.address),
    w = await y.getSigner(s),
    l = new A(t.abi, t.bytecode, w),
    g = l.interface.encodeDeploy(o),
    m = await l.getDeployTransaction(...o, { value: r });
  let d;
  try {
    d = await deploymentFees(E, { account: s, data: m.data, value: r });
  } catch (b) {
    throw new Error(`Deployment preflight failed: ${T(b)}`);
  }
  (await h(), n());
  const { gas, ...fees } = d;
  const f = await w.sendUncheckedTransaction({
    ...m,
    ...fees,
    chainId: c.id,
    gasLimit: gas,
  });
  if (!/^0x[\da-f]{64}$/i.test(f))
    throw new Error("The wallet did not return a transaction hash");
  return { hash: f, account: s, encoded: g, contract: t };
}
async function k(a) {
  const t = await C(a.hash);
  if (!t.contractAddress || u(t.from) !== a.account)
    throw new Error("The receipt does not match this contract deployment");
  const { hash: o, account: r, contract: n, encoded: i } = a,
    e = t.contractAddress;
  return {
    id: o,
    name: n.symbol,
    kind: "Custom",
    owner: r,
    created: Date.now(),
    address: e,
    parts: [
      {
        role: n.symbol,
        address: e,
        hash: t.transactionHash,
        feeWei: feePaid(t),
        encoded: i,
        contract: n,
        verification: { state: "Unverified" },
      },
    ],
  };
}
export { k as confirmAssistantContract, D as submitAssistantContract };
