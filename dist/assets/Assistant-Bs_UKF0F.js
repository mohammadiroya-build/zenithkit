const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./lib.esm-CaOQ8GKa.js",
      "./provider-browser-LBmMibJ8.js",
      "./index-BOd0iaB5.js",
      "./index-CERNRboz.css",
      "./deployment-DiAeDUBl.js",
    ]),
) => i.map((i) => d[i]);
import { requestLanguages } from "./request-languages.js";
import { matchStorageRequest } from "./request-storage.js";
import { createBuildTiming, formatBuildTime } from "./build-timing.js";
import { formatZthFee } from "./contract-fees.js";
import * as deploymentTools from "./Deploy-CSRagFYr.js";
import {
  ah as Oa,
  ai as V,
  aj as y,
  ak as e,
  al as ua,
  am as K,
  an as Ca,
  ao as ii,
  ap as ni,
  aq as sa,
  e as ha,
  ar as ei,
  as as oi,
} from "./index-BOd0iaB5.js";
import { C as ti, p as ui, b as si } from "./Deploy-CSRagFYr.js"; /**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const li = [
    ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
    ["path", { d: "M12 19V5", key: "x0mq9r" }],
  ],
  ri = Oa("arrow-up", li);
/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ki = [
    ["path", { d: "M12 7v14", key: "1akyts" }],
    [
      "path",
      {
        d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
        key: "ruj8y",
      },
    ],
  ],
  mi = Oa("book-open", ki),
  W = 1600,
  la = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/,
  Ma = String.raw`(?:\d{1,3}(?:[,]\d{3})+|\d+)(?:[.]\d+)?`,
  hi = String.raw`(?:thousand|million|billion|k|m|b)`,
  Ea = String.raw`${Ma}(?:\s*${hi}(?![\p{L}\p{N}]))?`,
  Z = String.raw`(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|«[^»]*»)`,
  gi = String.raw`(?:${Z}|[^\s,;:!?]+)`,
  O = String.raw`\s*(?:[:=]\s*|\s+)`,
  yi = String.raw`(?:\b(?:collection|token)\s+name\b|\b(?:named|called|name)\b)`,
  bi = String.raw`(?:\b(?:ticker|symbol)\b)`,
  Ba = String.raw`(?:\b(?:total\s+|fixed\s+|initial\s+)?supply\b)`,
  pi = {
    second: 1n,
    minute: 60n,
    hour: 3600n,
    day: 86400n,
    week: 604800n,
  },
  ci = (1n << 256n) - 1n,
  wi = [
    [
      "erc20",
      new RegExp("(?<![\\p{L}\\p{N}])erc[\\s-]*20(?![\\p{L}\\p{N}])", "giu"),
    ],
    [
      "erc721",
      new RegExp(
        "(?<![\\p{L}\\p{N}])(?:erc[\\s-]*721|nft collection|nft)(?![\\p{L}\\p{N}])",
        "giu",
      ),
    ],
    [
      "erc1155",
      new RegExp("(?<![\\p{L}\\p{N}])erc[\\s-]*1155(?![\\p{L}\\p{N}])", "giu"),
    ],
    [
      "staking",
      new RegExp(
        "(?<![\\p{L}\\p{N}])(?:staking pool|staking|stake pool)(?![\\p{L}\\p{N}])",
        "giu",
      ),
    ],
    [
      "voting",
      new RegExp(
        "(?<![\\p{L}\\p{N}])(?:voting|ballot|poll)(?![\\p{L}\\p{N}])",
        "giu",
      ),
    ],
    [
      "ownership",
      new RegExp(
        "(?<![\\p{L}\\p{N}])(?:two-step ownership|ownership|ownable)(?![\\p{L}\\p{N}])",
        "giu",
      ),
    ],
  ],
  Pa = [
    [
      "ERC20",
      "Create an ERC20 named Test with symbol TST and 1 million supply\nContract name: TestToken",
    ],
    [
      "ERC721",
      'ERC721 named "Zenith Art" with symbol ZART\nContract name: ZenithArt',
    ],
    [
      "ERC1155",
      'ERC1155 with URI "ipfs://metadata/{id}.json"\nContract name: ZenithItems',
    ],
    [
      "Staking",
      "Staking with token address 0x000000000000000000000000000000000000dEaD, lock 7 days, reward 5%\nContract name: ZenithStaking",
    ],
    [
      "Voting",
      'Voting with options "Blue", "Green" for 3 days\nContract name: ColorVote',
    ],
    ["Ownership", "Two-step ownership\nContract name: ZenithOwner"],
  ];
function ji(a) {
  return a
    .replace(/[\u200c\u200e\u200f\u061c]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}
function R(a, i) {
  const n = new RegExp(i, "iu").exec(a.text);
  return n
    ? ((a.text = `${a.text.slice(0, n.index)} ${a.text.slice(n.index + n[0].length)}`),
      n[1] ?? "")
    : "";
}
function Ua(a) {
  return /^(?:"[\s\S]*"|'[\s\S]*'|«[\s\S]*»)$/.test(a)
    ? a.slice(1, -1).replace(/\\(["'\\])/g, "$1")
    : a;
}
function P(a, i) {
  return Ua(R(a, `${i}${O}(${gi})`));
}
function Sa(a, i) {
  const [n, o = ""] = a
      .toLowerCase()
      .replace(/[,]/g, "")
      .replace(/(\d)(?=[\p{L}])/u, "$1 ")
      .trim()
      .split(/\s+/),
    t =
      {
        k: 3,
        thousand: 3,
        m: 6,
        million: 6,
        b: 9,
        billion: 9,
      }[o] ?? 0,
    [r, d = ""] = n.split("."),
    u = i + t - d.length,
    m = `${r}${d}`,
    k = u < 0 ? BigInt(m) / 10n ** BigInt(-u) : BigInt(m) * 10n ** BigInt(u);
  if ((u < 0 && BigInt(m) % 10n ** BigInt(-u) !== 0n) || k > ci)
    throw new Error("The amount has too many decimal places or is too large");
  return k;
}
function Na(a) {
  const i = R(
    a,
    String.raw`(?:(?:\b(?:lock(?:ed)?(?: duration)?|duration|for)\b)${O})?(\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?))(?![\p{L}\p{N}])`,
  );
  if (!i) return null;
  const [, n, o] = /^(\d+)\s*(.+)$/.exec(i),
    t = BigInt(n) * pi[o.toLowerCase().replace(/s$/, "")];
  if (!t || t > 31536000n)
    throw new Error("Use a duration between one second and one year");
  return t;
}
function vi(a) {
  const n = (a.match(/[A-Za-z0-9]+/g) ?? [])
    .map((o) => o[0].toUpperCase() + o.slice(1))
    .join("")
    .slice(0, 56);
  return n ? (/^\d/.test(n) ? `Contract${n}` : n) : "";
}
function Y(a, i, n, o = !0) {
  if ((o && !a.trim()) || a.length > n || /[\u0000-\u001f\u007f]/.test(a))
    throw new Error(
      `Use ${o ? "a nonempty " : "a "} ${i} up to ${n} characters`.replace(
        / {2,}/g,
        " ",
      ),
    );
  return a;
}
function fi(a) {
  const i = new RegExp(
    "(?<![\\p{L}\\p{N}])(?:fixed supply|i|want|would|like|please|create|make|build|deploy|generate|a|an|the|and|of|with|as|for|using|total|fixed|contract|standard|simple|basic|token|collection|multi-token|fungible|owner-minted|owner-only)(?![\\p{L}\\p{N}])",
    "giu",
  );
  return !a.replace(i, " ").replace(/[\s.,;:!?()]+/g, "");
}
function $a(a) {
  if (typeof a != "string" || !a.trim())
    throw new Error("Describe the contract you want to build");
  if (a.length > W) throw new Error(`Keep the request under ${W} characters`);
  const n = { text: ji(a.trim()) },
    o = P(
      n,
      String.raw`(?:\b(?:contract name|contract named|contract called|solidity name)\b)`,
    ).replace(/[.,;!?]+$/, "");
  if (o && !la.test(o))
    throw new Error("Use a Solidity contract name such as TestToken");
  const t = /^\s*(?:custom|special)\s*:/iu.test(n.text),
    r = n.text.replace(new RegExp(Z, "gu"), " ");
  let d = wi.filter(([, c]) => [...r.matchAll(c)].length > 0);
  d.some(([c]) => c === "staking") &&
    /\berc[\s-]*20\s+token\s+address\b/iu.test(n.text) &&
    ((n.text = n.text.replace(/\berc[\s-]*20\s+(?=token\s+address\b)/iu, "")),
    (d = d.filter(([c]) => c !== "erc20")));
  const u = !t && d.length === 1 ? d[0][0] : "custom",
    m = ["erc20", "erc721"].includes(u)
      ? P(n, yi).replace(/[.,;!?]+$/, "")
      : "",
    k = o || vi(m);
  function b() {
    const c = P({ text: n.text }, String.raw`\b(?:named|called)\b`).replace(
        /[.,;!?]+$/,
        "",
      ),
      x = k || c;
    if (!la.test(x))
      throw new Error(
        "Include a Solidity identifier, for example: Contract name: MyContract",
      );
    return { kind: "custom", contractName: x, request: a.trim() };
  }
  if (u === "custom") return b();
  const s = {};
  if (
    ((u === "erc20" || u === "erc721") &&
      (s.symbol = P(n, bi).replace(/[.,;!?]+$/, "")),
    u === "erc20" &&
      ((s.supply =
        R(n, `${Ba}${O}(-?${Ea})(?![\\p{L}\\p{N}])`) ||
        R(
          n,
          `(?<![\\p{L}\\p{N}.,-])(-?${Ea})\\s+(?:tokens?\\s+)?(?:${Ba}|tokens?\\b)`,
        )),
      s.supply.startsWith("-")))
  )
    throw new Error("Use a supply greater than zero");
  if (
    ((u === "erc721" || u === "erc1155") &&
      (s.uri = P(n, String.raw`\b(?:base uri|metadata uri|uri)\b`).replace(
        new RegExp("(?<=[}/])\\.$"),
        "",
      )),
    u === "staking" &&
      ((s.token = R(
        n,
        String.raw`(?:\b(?:token address|token)\b)${O}(0x[\da-f]{40})(?![\da-f])`,
      )),
      (s.reward = R(
        n,
        String.raw`\b(?:reward(?: rate)?|fixed reward)\b${O}(${Ma})\s*%`,
      )),
      (s.seconds = Na(n))),
    u === "voting" &&
      ((s.options = R(
        n,
        String.raw`(?:\b(?:options|choices)\b)${O}(${Z}(?:\s*[,|]\s*${Z})+)`,
      )),
      (s.seconds = Na(n))),
    !fi(n.text.replace(d[0][1], " ")))
  )
    return b();
  if (!la.test(k))
    throw new Error(
      "Include a Solidity identifier, for example: Contract name: MyContract",
    );
  if (
    (u === "erc20" || u === "erc721") &&
    ((s.name = Y(m || k, "token name", 64)),
    (s.symbol = Y(
      s.symbol ||
        s.name
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 5)
          .toUpperCase() ||
        "TOKEN",
      "symbol",
      12,
    )),
    !/^[A-Za-z0-9_-]+$/.test(s.symbol))
  )
    throw new Error(
      "Use letters, digits, underscores or hyphens for the symbol",
    );
  if (u === "erc20") {
    if (!s.supply)
      throw new Error(
        "Include the fixed supply, for example: 1 million supply",
      );
    if (((s.baseUnits = Sa(s.supply, 18)), !s.baseUnits))
      throw new Error("Use a supply greater than zero");
  }
  if (
    ((u === "erc1155" || u === "erc721") && Y(s.uri, "metadata URI", 400, !1),
    u === "staking")
  ) {
    if (!s.token || /^0x0{40}$/i.test(s.token))
      throw new Error("Include a deployed staking token address");
    if (!s.seconds)
      throw new Error("Include a lock duration, for example: lock 7 days");
    if (((s.rewardBps = s.reward ? Sa(s.reward, 2) : 0n), s.rewardBps > 10000n))
      throw new Error("Use a fixed reward from 0% to 100%");
  }
  if (u === "voting") {
    if (!s.options || !s.seconds)
      throw new Error(
        'Include quoted options and a duration, for example: options "Yes", "No" for 3 days',
      );
    if (
      ((s.options = [...s.options.matchAll(new RegExp(Z, "gu"))].map((c) =>
        Y(Ua(c[0]).trim(), "option", 64),
      )),
      s.options.length > 8 ||
        new Set(s.options.map((c) => c.toLowerCase())).size !==
          s.options.length)
    )
      throw new Error("Use two to eight distinct voting options");
  }
  return { kind: u, contractName: k, values: s };
}
const on = (a) =>
    a.map((i) => `import "@openzeppelin/contracts/${i}.sol";`).join(`
`),
  _ = (a, i) => `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
${on(a)}

${i.trim()}
`;
function $(a) {
  return /^[\x20-\x7e]*$/.test(a)
    ? JSON.stringify(a)
    : `string(hex"${Array.from(new TextEncoder().encode(a), (n) => n.toString(16).padStart(2, "0")).join("")}")`;
}
const ma = "access/Ownable",
  Ta = 10n ** 18n;
function tn(a) {
  const i = (a / Ta).toLocaleString("en-US"),
    n = (a % Ta).toString().padStart(18, "0").replace(/0+$/, "");
  return n ? `${i}.${n}` : i;
}
const un = {
  erc20: (a, i) => ({
    title: "ERC20 · Fixed supply",
    details: [
      ["Token", i.name],
      ["Symbol", i.symbol],
      ["Supply", tn(i.baseUnits)],
      ["Initial holder", "Deploying wallet"],
    ],
    source: _(
      ["token/ERC20/ERC20"],
      `
contract ${a} is ERC20 {
    constructor() ERC20(${$(i.name)}, ${$(i.symbol)}) {
        _mint(msg.sender, ${i.baseUnits});
    }
}`,
    ),
  }),
  erc721: (a, i) => ({
    title: "ERC721 · Owner-minted collection",
    details: [
      ["Collection", i.name],
      ["Symbol", i.symbol],
      ["Metadata base URI", i.uri || "None"],
      ["Owner", "Deploying wallet"],
    ],
    source: _(
      ["token/ERC721/ERC721", ma],
      `
contract ${a} is ERC721, Ownable {
    uint256 private nextId = 1;

    constructor() ERC721(${$(i.name)}, ${$(i.symbol)}) Ownable(msg.sender) {}

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextId++;
        _safeMint(to, tokenId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return ${$(i.uri)};
    }
}`,
    ),
  }),
  erc1155: (a, i) => ({
    title: "ERC1155 · Owner-minted multi-token",
    details: [
      ["Metadata URI", i.uri || "None"],
      ["Minting", "Owner only, by token ID and quantity"],
      ["Owner", "Deploying wallet"],
    ],
    source: _(
      ["token/ERC1155/ERC1155", ma],
      `
contract ${a} is ERC1155, Ownable {
    constructor() ERC1155(${$(i.uri)}) Ownable(msg.sender) {}

    function mint(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyOwner {
        _mintBatch(to, ids, amounts, "");
    }
}`,
    ),
  }),
  staking: (a, i) => ({
    title: "Staking · Fixed lock and prefunded rewards",
    details: [
      ["Staking and reward token", i.token],
      ["Lock", `${i.seconds} seconds`],
      [
        "Fixed reward per completed lock",
        `${i.rewardBps / 100n}.${(i.rewardBps % 100n).toString().padStart(2, "0")}%`,
      ],
      [
        "Reward funding",
        "Anyone can fund the pool, with no early withdrawals or admin drain",
      ],
    ],
    source: _(
      [
        "token/ERC20/utils/SafeERC20",
        "utils/ReentrancyGuard",
        "utils/math/Math",
      ],
      `
contract ${a} is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public constant LOCK_SECONDS = ${i.seconds};
    uint256 public constant REWARD_BPS = ${i.rewardBps};
    uint256 public availableRewards;

    struct Position { uint256 principal; uint256 reward; uint256 unlockAt; }
    mapping(address => Position) public positions;

    event RewardsFunded(address indexed account, uint256 amount);
    event Staked(address indexed account, uint256 principal, uint256 reward, uint256 unlockAt);
    event Withdrawn(address indexed account, uint256 principal, uint256 reward);

    constructor() {
        address stakingToken = address(bytes20(hex"${i.token.slice(2)}"));
        require(stakingToken.code.length > 0, "Token contract required");
        token = IERC20(stakingToken);
    }

    function fundRewards(uint256 amount) external nonReentrant {
        require(REWARD_BPS != 0 && amount != 0, "Rewards not enabled or zero amount");
        _pullExact(amount);
        availableRewards += amount;
        emit RewardsFunded(msg.sender, amount);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount != 0 && positions[msg.sender].principal == 0, "One nonzero position per wallet");
        uint256 reward = Math.mulDiv(amount, REWARD_BPS, 10000);
        require(reward <= availableRewards, "Rewards not funded");
        availableRewards -= reward;
        uint256 unlockAt = block.timestamp + LOCK_SECONDS;
        positions[msg.sender] = Position(amount, reward, unlockAt);
        _pullExact(amount);
        emit Staked(msg.sender, amount, reward, unlockAt);
    }

    function withdraw() external nonReentrant {
        Position memory position = positions[msg.sender];
        require(position.principal != 0 && block.timestamp >= position.unlockAt, "No unlocked position");
        delete positions[msg.sender];
        uint256 payout = position.principal + position.reward;
        uint256 balance = token.balanceOf(msg.sender);
        token.safeTransfer(msg.sender, payout);
        require(token.balanceOf(msg.sender) == balance + payout, "Use a plain ERC20");
        emit Withdrawn(msg.sender, position.principal, position.reward);
    }

    function _pullExact(uint256 amount) private {
        uint256 beforeTransfer = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        require(token.balanceOf(address(this)) == beforeTransfer + amount, "Use a plain ERC20");
    }
}`,
    ),
  }),
  voting: (a, i) => ({
    title: "Voting · Single public poll",
    details: [
      ["Options", i.options.join(" / ")],
      ["Voting period", `${i.seconds} seconds from deployment`],
      ["Eligibility", "One vote per wallet; not one vote per person"],
    ],
    source: _(
      [],
      `
contract ${a} {
    string[] public options;
    uint256[] public counts;
    uint256 public immutable closesAt;
    mapping(address => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 indexed option);

    constructor() {
        closesAt = block.timestamp + ${i.seconds};
${i.options.map((n) => `        options.push(${$(n)});`).join(`
`)}
        counts = new uint256[](options.length);
    }

    function vote(uint256 option) external {
        require(block.timestamp < closesAt, "Voting is closed");
        require(!hasVoted[msg.sender] && option < options.length, "Already voted or invalid option");
        hasVoted[msg.sender] = true;
        counts[option] += 1;
        emit VoteCast(msg.sender, option);
    }

    function optionCount() external view returns (uint256) {
        return options.length;
    }
}`,
    ),
  }),
  ownership: (a) => ({
    title: "Ownership · Two-step transfer",
    details: [
      ["Owner", "Deploying wallet"],
      ["Transfer", "New owner must accept"],
      ["Renouncing ownership", "Available to the owner"],
    ],
    source: _(
      [ma, "access/Ownable2Step"],
      `
contract ${a} is Ownable2Step {
    constructor() Ownable(msg.sender) {}
}`,
    ),
  }),
};
function sn({ kind: a, contractName: i, values: n }) {
  return { ...un[a](i, n), name: i, generated: !1 };
}
async function hostedDraft(prompt, language, signal, repair) {
  const timeout = AbortSignal.timeout(repair ? 18_000 : 33_000);
  let response;
  try {
    response = await fetch(new URL("../api/contracts/draft", import.meta.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language: language || undefined, ...repair }),
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch {
    signal.throwIfAborted();
    if (timeout.aborted) throw new Error("The draft took too long, try a shorter request");
    throw new Error("Could not reach hosted drafting, check your connection or use a quick template");
  }
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new Error("Hosted drafting is not available here, quick templates still work");
  }
  const result = await response.json();
  if (!response.ok || typeof result.source !== "string") {
    throw new Error(result.error || "No draft came back, try again or use a quick template");
  }
  return result.source;
}
function shouldRepair(error) {
  return /\b(?:ParserError|TypeError|DeclarationError|SyntaxError|CompilerError|DocstringParsingError):|No deployable contract|Multiple deployable contracts|Link external libraries/i.test(error?.message ?? "");
}
const X = "zenith-kit-assistant-pending",
  ln = Pa[0][1],
  Ia = (a = "") => ({
    title: "Custom Solidity",
    name: a,
    source: "",
    details: [],
    generated: !1,
    editable: !0,
  }),
  rn = () => {
    var i;
    const a = ei(X, null);
    return /^0x[\da-f]{64}$/i.test((a == null ? void 0 : a.hash) ?? "") &&
      /^0x[\da-f]{40}$/i.test(a.account) &&
      Array.isArray((i = a.contract) == null ? void 0 : i.abi) &&
      typeof a.encoded == "string"
      ? a
      : null;
  };
function hn({ wallet: a, record: i, save: n }) {
  var Da;
  const [o, t] = y.useState(""),
    [requestLanguage, setRequestLanguage] = y.useState(""),
    [buildTimings, setBuildTimings] = y.useState(null),
    [r, d] = y.useState(""),
    [u, m] = y.useState(null),
    [k, b] = y.useState(null),
    [s, c] = y.useState(null),
    [x, w] = y.useState(""),
    [ba, A] = y.useState(""),
    [pa, ca] = y.useState("[]"),
    [wa, ja] = y.useState(""),
    [ia, L] = y.useState(!1),
    [f, na] = y.useState(rn),
    [z, ea] = y.useState(null),
    [M, va] = y.useState(!1),
    N = y.useRef(null),
    C = y.useRef(!1),
    fa = y.useRef(null),
    D = y.useRef(null),
    F = s == null ? void 0 : s.abi.find((l) => l.type === "constructor");
  function Ya(l) {
    var h;
    (setRequestLanguage(""), t(l), (h = fa.current) == null || h.focus());
  }
  function za(l) {
    (b(l), c(null), L(!1), ca("[]"), ja(""), ea(null));
  }
  y.useEffect(() => () => N.current?.abort(), []);
  function oa(l) {
    za(l);
    m(null);
    A("");
  }

  async function G(l, h, prepared) {
    w("Compiling in your browser…");
    const p = await si(l.source, l.name, [], h.signal, prepared);
    return (h.signal.throwIfAborted(), c(p), p);
  }
  async function qa(l) {
    if (N.current || C.current || f) return;
    const h = new AbortController();
    ((N.current = h), A(""));
    try {
      await l(h);
    } catch (p) {
      A(h.signal.aborted ? "Build canceled" : ha(p));
    } finally {
      ((N.current = null), w(""));
    }
  }
  function Ja(event) {
    event.preventDefault();
    const request = o.trim();
    return qa(async (build) => {
      const timing = createBuildTiming();
      const signal = AbortSignal.any([build.signal, AbortSignal.timeout(56_000)]);
      let result = "Failed";
      let prepared;
      let compilerTask;
      setBuildTimings(null);
      d(request);
      m(null);
      za(null);
      w("Reading your request…");
      try {
        const quick = await timing.measure("request", () => {
          const storage = matchStorageRequest(request);
          if (storage) return storage;
          if (requestLanguage && requestLanguage !== "en") return null;
          try {
            const parsed = $a(request);
            return parsed.kind === "custom" ? null : { ...sn(parsed), editable: false };
          } catch {
            return null;
          }
        });
        if (quick) {
          b(quick);
          if (D.current) D.current.open = false;
          await timing.measure("compile", () => G(quick, { signal }));
        } else {
          compilerTask = timing.measure("compilerPrep", () =>
            deploymentTools.prepareAssistantCompiler(signal)
          ).catch(() => null);
          w("Drafting Solidity…");
          const source = await timing.measure("draft", () =>
            hostedDraft(request, requestLanguage, signal)
          );
          signal.throwIfAborted();
          const draft = { ...Ia(""), title: "Custom draft", generated: true, source };
          b(draft);
          requestAnimationFrame(() => {
            if (D.current && !build.signal.aborted) D.current.open = true;
          });
          prepared = await compilerTask;
          let contract;
          try {
            contract = await timing.measure("compile", () => G(draft, { signal }, prepared));
          } catch (error) {
            signal.throwIfAborted();
            if (!shouldRepair(error)) throw error;
            w("Fixing a compiler error…");
            let repaired;
            try {
              repaired = await timing.measure("repair", () =>
                hostedDraft(request, requestLanguage, signal, { source, diagnostic: ha(error).slice(0, 2000) })
              );
            } catch (repairError) {
              signal.throwIfAborted();
              throw new Error(`${ha(repairError)}\n\nCompiler output:\n${ha(error)}`);
            }
            const fixed = { ...draft, source: repaired };
            b(fixed);
            contract = await timing.measure("recompile", () => G(fixed, { signal }, prepared));
          }
          b((current) => current ? { ...current, name: contract.symbol } : current);
        }
        result = "Compiled";
        m("Your contract compiled, review the source before deploying");
      } catch (error) {
        if (build.signal.aborted) result = "Canceled";
        else if (signal.aborted) throw new Error("The build took too long, try a shorter request or a quick template");
        throw error;
      } finally {
        if (prepared) prepared.close();
        else if (compilerTask) void compilerTask.then((compiler) => compiler?.close());
        setBuildTimings(timing.finish(result));
      }
    });
  }
  function Xa() {
    N.current ||
      C.current ||
      f ||
      (d(""),
      m(null),
      setBuildTimings(null),
      oa(Ia()),
      requestAnimationFrame(() => {
        var l;
        D.current &&
          ((D.current.open = !0),
          (l = D.current.querySelector("textarea")) == null || l.focus());
      }));
  }
  async function xa(l, h) {
    w("Waiting for Zenith finality…");
    try {
      const p = await h(l);
      (ea(p),
        na(null),
        sa(X, {}),
        i(p.name, p.parts[0].hash, "Finalized"),
        n(p));
    } catch (p) {
      const g = da(p),
        q = /transaction reverted on zenith/i.test(g);
      (A(g),
        va(q),
        i(l.contract.symbol, l.hash, q ? "Failed" : "Not confirmed"));
    }
  }
  async function Qa() {
    if (!(!s || !ia || !a.isConnected || z || f || C.current || N.current)) {
      ((C.current = !0), A(""), ea(null), w("Checking the deployment…"));
      try {
        const { parseEther: l } = await V(
            async () => {
              const { parseEther: T } = await import("./lib.esm-CaOQ8GKa.js");
              return { parseEther: T };
            },
            __vite__mapDeps([0, 1, 2, 3]),
            import.meta.url,
          ),
          { submitAssistantContract: h, confirmAssistantContract: p } = await V(
            async () => {
              const {
                submitAssistantContract: T,
                confirmAssistantContract: B,
              } = await import("./deployment-DiAeDUBl.js");
              return {
                submitAssistantContract: T,
                confirmAssistantContract: B,
              };
            },
            __vite__mapDeps([4, 2, 3, 1]),
            import.meta.url,
          ),
          g = wa.trim();
        if (g && !/^\d+(?:\.\d{1,18})?$/.test(g))
          throw new Error("Enter a ZTH amount with up to 18 decimals");
        const q = g ? l(g) : 0n;
        if (q && (F == null ? void 0 : F.stateMutability) !== "payable")
          throw new Error("This constructor does not accept ZTH");
        const j = await h(a, s, ui(pa), q, () => w("Approve in your wallet…"));
        (na(j),
          sa(X, j),
          i(j.contract.symbol, j.hash, "Pending"),
          L(!1),
          await xa(j, p));
      } catch (l) {
        A(da(l));
      } finally {
        ((C.current = !1), w(""));
      }
    }
  }
  async function ai() {
    if (!(!f || C.current || N.current)) {
      ((C.current = !0), A(""), w("Checking Zenith…"));
      try {
        const { confirmAssistantContract: l } = await V(
          async () => {
            const { confirmAssistantContract: h } =
              await import("./deployment-DiAeDUBl.js");
            return { confirmAssistantContract: h };
          },
          __vite__mapDeps([4, 2, 3, 1]),
          import.meta.url,
        );
        await xa(f, l);
      } catch (l) {
        A(da(l));
      } finally {
        ((C.current = !1), w(""));
      }
    }
  }
  const E = !!x || !!f,
    ta =
      (z == null ? void 0 : z.parts[0].hash) ?? (f == null ? void 0 : f.hash);
  return e.jsxs("div", {
    className: "stack assistant",
    children: [
      e.jsxs("div", {
        className: "assistant-layout",
        children: [
          e.jsxs(ua, {
            title: "Contract Assistant",
            label: e.jsx("span", {
              className: "badge neutral",
              children: "No model download",
            }),
            children: [
              e.jsx("p", {
                className: "card-desc",
                children:
                  "Describe what your contract should do, then review the Solidity before you choose whether to deploy",
              }),
              e.jsxs("form", {
                className: "assistant-compose",
                onSubmit: Ja,
                children: [
                  e.jsxs("label", {
                    className: "field",
                    children: [
                      e.jsx("span", { children: "Contract request" }),
                      e.jsx("textarea", {
                        ref: fa,
                        value: o,
                        maxLength: W,
                        rows: 4,
                        placeholder: ln,
                        disabled: E,
                        dir: "auto",
                        onChange: (l) => t(l.target.value),
                      }),
                    ],
                  }),
                  e.jsxs("label", {
                    className: "field",
                    children: [
                      e.jsx("span", { children: "Request language" }),
                      e.jsxs("select", {
                        value: requestLanguage,
                        disabled: E,
                        onChange: (l) => setRequestLanguage(l.target.value),
                        children: [
                          e.jsx("option", {
                            value: "",
                            children: "Auto-detect",
                          }),
                          ...requestLanguages.map(({ code, label }) =>
                            e.jsx(
                              "option",
                              { value: code, children: label },
                              code,
                            ),
                          ),
                        ],
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "action-row assistant-compose-actions",
                    children: [
                      e.jsxs("button", {
                        type: "submit",
                        className: "btn primary",
                        disabled: !o.trim() || E,
                        children: [
                          e.jsx(ri, { size: 16, "aria-hidden": "true" }),
                          "Build contract",
                        ],
                      }),
                      e.jsxs("button", {
                        type: "button",
                        className: "btn ghost",
                        disabled: E,
                        onClick: Xa,
                        children: [
                          e.jsx(ti, { size: 16, "aria-hidden": "true" }),
                          "Paste Solidity",
                        ],
                      }),
                      x &&
                        !C.current &&
                        e.jsx("button", {
                          type: "button",
                          className: "btn ghost",
                          onClick: () => {
                            var l;
                            return (l = N.current) == null ? void 0 : l.abort();
                          },
                          children: "Cancel build",
                        }),
                      e.jsxs("span", {
                        className: "small muted assistant-count",
                        "aria-label": "Characters used",
                        children: [o.length, " / ", W],
                      }),
                    ],
                  }),
                  e.jsx("p", {
                    className: "small muted",
                    children:
                      "Quick templates run in your browser, while custom requests go to a hosted drafting service, so leave out secrets or private code",
                  }),
                ],
              }),
            ],
          }),
          e.jsxs("aside", {
            className: "card assistant-help",
            "aria-labelledby": "assistant-help",
            children: [
              e.jsxs("h2", {
                className: "card-title",
                id: "assistant-help",
                children: [
                  e.jsx(mi, { size: 17, "aria-hidden": "true" }),
                  "Help",
                ],
              }),
              e.jsx("p", {
                className: "small muted",
                children:
                  "Write in your preferred language or mix languages without waiting for a separate translation step",
              }),
              e.jsx("div", {
                className: "assistant-examples",
                "aria-label": "Contract request examples",
                children: [
                  ["Number storage", "Create a contract that stores a number"],
                  ["Text storage", "Create a contract that stores a message"],
                  ...Pa,
                ].map(([l, h]) =>
                  e.jsx(
                    "button",
                    {
                      type: "button",
                      className: "btn ghost small",
                      disabled: E,
                      onClick: () => Ya(h),
                      children: l,
                    },
                    l,
                  ),
                ),
              }),
              e.jsxs("p", {
                className: "small muted",
                children: [
                  "Add ",
                  e.jsx("code", { children: "Contract name: MyContract" }),
                  " to choose the Solidity name, then check the draft against your request before deploying",
                ],
              }),
            ],
          }),
        ],
      }),
      r &&
        e.jsxs("div", {
          className: "assistant-request",
          children: [
            e.jsx("span", {
              className: "small muted",
              children: "Your request",
            }),
            e.jsx("p", { dir: "auto", children: r }),
          ],
        }),
      u &&
        e.jsxs("div", {
          className: "assistant-request justify-self-start",
          role: "status",
          children: [
            e.jsx("span", { className: "small muted", children: "Assistant" }),
            e.jsx("p", { children: u }),
          ],
        }),
      x && e.jsx(K, { children: x }),
      buildTimings &&
        e.jsxs("details", {
          className: "assistant-request small",
          children: [
            e.jsx("summary", {
              children: `Build timings · ${buildTimings.result} · ${formatBuildTime(buildTimings.ms)} total`,
            }),
            e.jsx("dl", {
              className: "assistant-details",
              children: buildTimings.stages.map(({ key, label, ms }) =>
                e.jsxs(
                  "div",
                  {
                    children: [
                      e.jsx("dt", {
                        className: "small muted",
                        children: label,
                      }),
                      e.jsx("dd", { children: formatBuildTime(ms) }),
                    ],
                  },
                  key,
                ),
              ),
            }),
            e.jsx("p", {
              className: "muted",
              children:
                "Some steps run in parallel, and these timings do not include deployment",
            }),
          ],
        }),
      ba &&
        e.jsx(K, {
          mode: "error",
          children: e.jsx("pre", { className: "pre", children: ba }),
        }),
      k &&
        e.jsx(ua, {
          title: k.title,
          label:
            s && e.jsx("span", { className: "badge", children: "Compiled" }),
          children: e.jsxs("div", {
            className: "stack",
            children: [
              !!k.details.length &&
                e.jsx("dl", {
                  className: "assistant-details",
                  children: k.details.map(([l, h]) =>
                    e.jsxs(
                      "div",
                      {
                        children: [
                          e.jsx("dt", {
                            className: "small muted",
                            children: l,
                          }),
                          e.jsx("dd", { dir: "auto", children: h }),
                        ],
                      },
                      l,
                    ),
                  ),
                }),
              k.details.some(
                ([l, h]) =>
                  l === "Staking and reward token" && /^0x0{36}dead$/i.test(h),
              ) &&
                e.jsx(K, {
                  mode: "warning",
                  children:
                    "Replace the example token address with a deployed ERC20 address before deploying",
                }),
              e.jsxs("details", {
                ref: D,
                className: "assistant-source",
                children: [
                  e.jsxs("summary", {
                    children: ["Solidity source", k.name ? ` · ${k.name}` : ""],
                  }),
                  k.editable
                    ? e.jsxs("div", {
                        className: "stack mt-3",
                        children: [
                          e.jsxs("label", {
                            className: "field",
                            children: [
                              e.jsx("span", {
                                children: "Solidity contract name",
                              }),
                              e.jsx("input", {
                                value: k.name,
                                maxLength: 64,
                                disabled: E,
                                placeholder: "Optional for a single contract",
                                onChange: (l) =>
                                  oa({ ...k, name: l.target.value.trim() }),
                              }),
                            ],
                          }),
                          e.jsxs("label", {
                            className: "field",
                            children: [
                              e.jsx("span", { children: "Solidity source" }),
                              e.jsx("textarea", {
                                rows: 10,
                                className: "mono",
                                spellCheck: !1,
                                autoCapitalize: "off",
                                maxLength: 32e3,
                                value: k.source,
                                disabled: E,
                                onChange: (l) =>
                                  oa({ ...k, source: l.target.value }),
                              }),
                            ],
                          }),
                        ],
                      })
                    : e.jsx("pre", {
                        className: "pre mt-3",
                        children: k.source,
                      }),
                ],
              }),
              s &&
                e.jsxs(e.Fragment, {
                  children: [
                    e.jsxs("p", {
                      className: "small muted",
                      children: [
                        "Solidity ",
                        s.compilerVersion,
                        " · EVM Paris · ",
                        s.symbol,
                      ],
                    }),
                    !!s.warnings.length &&
                      e.jsxs("details", {
                        className: "small",
                        children: [
                          e.jsxs("summary", {
                            children: [
                              "Compiler warnings (",
                              s.warnings.length,
                              ")",
                            ],
                          }),
                          e.jsx("pre", {
                            className: "pre mt-2",
                            children: s.warnings.join(`
`),
                          }),
                        ],
                      }),
                    k.editable &&
                      e.jsx(K, {
                        mode: "warning",
                        children:
                          "Compilation does not check contract safety or confirm that the code matches your request",
                      }),
                    !!(
                      (Da = F == null ? void 0 : F.inputs) != null && Da.length
                    ) &&
                      e.jsxs("label", {
                        className: "field",
                        children: [
                          e.jsx("span", {
                            children: "Constructor arguments (JSON array)",
                          }),
                          e.jsx("input", {
                            value: pa,
                            disabled: E,
                            onChange: (l) => {
                              (ca(l.target.value), L(!1));
                            },
                          }),
                          e.jsx("small", {
                            children: F.inputs
                              .map((l) => `${l.name || "argument"}: ${l.type}`)
                              .join(", "),
                          }),
                        ],
                      }),
                    (F == null ? void 0 : F.stateMutability) === "payable" &&
                      e.jsxs("label", {
                        className: "field",
                        children: [
                          e.jsx("span", {
                            children: "Constructor value in ZTH (optional)",
                          }),
                          e.jsx("input", {
                            value: wa,
                            inputMode: "decimal",
                            disabled: E,
                            onChange: (l) => {
                              (ja(l.target.value), L(!1));
                            },
                          }),
                        ],
                      }),
                    !z &&
                      !f &&
                      e.jsxs("label", {
                        className: "check",
                        children: [
                          e.jsx("input", {
                            type: "checkbox",
                            checked: ia,
                            disabled: E,
                            onChange: (l) => L(l.target.checked),
                          }),
                          "I reviewed the source and want to deploy it to Zenith Testnet",
                        ],
                      }),
                  ],
                }),
              s && !z && !f && !a.isConnected && e.jsx(kn, {}),

              e.jsxs("div", {
                className: "action-row",
                role: "group",
                "aria-label": "Contract actions",
                children: [
                  e.jsx("button", {
                    type: "button",
                    className: "btn ghost",
                    disabled: !k.source.trim() || E,
                    onClick: () =>
                      qa(
                        (l) => (
                          c(null),
                          L(!1),
                          m(null),
                          G({ ...k, name: k.name.trim() }, l)
                        ),
                      ),
                    children: "Compile source",
                  }),
                  !z &&
                    !f &&
                    e.jsx("button", {
                      type: "button",
                      className: "btn primary",
                      "aria-label": "Deploy to Zenith Testnet",
                      disabled: !s || !ia || !a.isConnected || E,
                      onClick: Qa,
                      children: "Deploy",
                    }),
                ],
              }),
            ],
          }),
        }),
      ta &&
        e.jsx(ua, {
          title: z
            ? "Deployment finalized"
            : M
              ? "Deployment reverted"
              : "Transaction submitted",
          label: e.jsx("span", {
            className: `badge ${z ? "" : M ? "failed" : "pending"}`,
            children: z ? "Finalized" : M ? "Reverted" : "Pending",
          }),
          children: e.jsxs("div", {
            className: "stack",
            children: [
              z && e.jsx(_a, { label: "Contract address", value: z.address }),
              e.jsx(_a, { label: "Transaction hash", value: ta }),
              z && formatZthFee(z.parts[0].feeWei) && e.jsx("p", {
                className: "small muted",
                children: `Network fee paid: ${formatZthFee(z.parts[0].feeWei)}`,
              }),
              e.jsxs("div", {
                className: "action-row",
                children: [
                  z &&
                    e.jsx(Ca, {
                      href: ii(z.address),
                      children: "View contract",
                    }),
                  e.jsx(Ca, { href: ni(ta), children: "View transaction" }),
                  f &&
                    !M &&
                    e.jsx("button", {
                      type: "button",
                      className: "btn ghost",
                      disabled: !!x,
                      onClick: ai,
                      children: "Check transaction again",
                    }),
                  M &&
                    e.jsx("button", {
                      type: "button",
                      className: "btn ghost",
                      onClick: () => {
                        (na(null), sa(X, {}), va(!1), A(""));
                      },
                      children: "Clear reverted attempt",
                    }),
                ],
              }),
            ],
          }),
        }),
    ],
  });
}
function _a({ label: a, value: i }) {
  return e.jsxs("div", {
    className: "assistant-result",
    children: [
      e.jsxs("div", {
        children: [
          e.jsx("span", { className: "small muted", children: a }),
          e.jsx("div", { className: "mono", children: i }),
        ],
      }),
      e.jsx(oi, { value: i, label: `Copy ${a.toLowerCase()}` }, i),
    ],
  });
}
function kn() {
  return e.jsx("p", {
    className: "small muted",
    children:
      "Connect your wallet at the top of the page when you are ready to deploy",
  });
}
function da(a) {
  var i, n;
  return (a == null ? void 0 : a.code) === "ACTION_REJECTED" ||
    (a == null ? void 0 : a.code) === 4001 ||
    ((n = (i = a == null ? void 0 : a.info) == null ? void 0 : i.error) == null
      ? void 0
      : n.code) === 4001
    ? "The wallet request was declined"
    : ha(a);
}
export { hn as default };
