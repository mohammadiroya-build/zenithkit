const current = "5.0.2";
const legacy = "4.9.6";
export const openZeppelinReleases = [current, legacy];
const packages = ["@openzeppelin/contracts", "@openzeppelin/contracts-upgradeable"];
const safeMath = "utils/math/SafeMath.sol";
const owns = (object, key) => Object.hasOwn(object, key);

function decodeImport(literal) {
  const escapes = { n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', "'": "'", "\n": "", "\r\n": "" };
  return literal.slice(1, -1).replace(/\\(?:x([\da-f]{2})|u([\da-f]{4})|(\r\n|[\s\S]))/gi,
    (match, byte, point, escaped) => byte || point ? String.fromCharCode(parseInt(byte ?? point, 16))
      : escapes[escaped] ?? match);
}

export function* solidityImports(content) {
  const tokens = /\/\/[^\n\r]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'|[A-Za-z_$][\w$]*|[;{}]/g;
  let reading = false;
  let path;
  for (const [token] of content.matchAll(tokens)) {
    if (token.startsWith("//") || token.startsWith("/*")) continue;
    if (token === "import") {
      reading = true;
      path = undefined;
    } else if (reading && (token[0] === '"' || token[0] === "'")) {
      path = decodeImport(token);
    } else if (reading && token === ";") {
      if (path !== undefined) yield path;
      reading = false;
    }
  }
}

function relativeUnit(unit, path) {
  if (!/^\.\.?\//.test(path)) return path;
  const parent = name => name.slice(0, Math.max(0, name.lastIndexOf("/"))).replace(/\/+$/, "");
  let base = parent(unit);
  for (const part of path.split("/")) {
    if (part === "..") base = parent(base);
    else if (part && part !== ".") base += `${base ? "/" : ""}${part}`;
  }
  return base;
}

function parseRule(rule) {
  const equal = rule.indexOf("=");
  if (equal < 0) return null;
  const left = rule.slice(0, equal);
  const colon = left.indexOf(":");
  const prefix = left.slice(colon + 1);
  return prefix ? { context: colon < 0 ? "" : left.slice(0, colon), prefix, target: rule.slice(equal + 1), rule } : null;
}

function matchRule(rules, unit, path) {
  let best;
  for (const rule of rules) {
    if (!unit.startsWith(rule.context) || !path.startsWith(rule.prefix)) continue;
    if (!best || rule.context.length > best.context.length ||
        (rule.context.length === best.context.length && rule.prefix.length >= best.prefix.length)) best = rule;
  }
  return best;
}

function aliasesFor(name, version) {
  if (!version) return [`${name}/`, `node_modules/${name}/`, ...(name === packages[0] ? ["openzeppelin-ide/"] : [])];
  const repo = name.replace("@openzeppelin/", "openzeppelin-");
  return [
    `${name}@${version}/`,
    `node_modules/${name}@${version}/`,
    `https://github.com/OpenZeppelin/${repo}/blob/v${version}/contracts/`,
    `https://raw.githubusercontent.com/OpenZeppelin/${repo}/v${version}/contracts/`,
    `https://unpkg.com/${name}@${version}/`,
    `https://cdn.jsdelivr.net/npm/${name}@${version}/`,
  ];
}

const aliases = packages.flatMap(name => ["", current, legacy].flatMap(version =>
  aliasesFor(name, version).map(prefix => ({ name, version, prefix }))));

function openZeppelin(path) {
  const offset = path.lastIndexOf("/node_modules/");
  const key = offset < 0 ? path : path.slice(offset + 1);
  const alias = aliases.find(({ prefix }) => key.startsWith(prefix));
  if (!alias) return null;
  const file = key.slice(alias.prefix.length);
  if (!file) return null;
  return { ...alias, key: `${alias.name}/${file}`, file, root: path.slice(0, -file.length) };
}

function installedRoots(units) {
  const roots = new Map();
  for (const unit of units) {
    const match = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\//g;
    const parts = [...unit.matchAll(match)].at(-1);
    if (!parts) continue;
    const prefix = `${parts[1]}/`;
    const folder = unit.slice(0, parts.index + parts[0].length);
    if (!roots.has(prefix)) roots.set(prefix, folder);
    else if (roots.get(prefix) !== folder) roots.set(prefix, null);
  }
  return roots;
}

export async function collectCustomImports(sources, remappings, loadBundle, release = "") {
  if (release && !openZeppelinReleases.includes(release)) throw new Error("Select a supported OpenZeppelin version");
  if (remappings !== undefined && (!Array.isArray(remappings) ||
      remappings.some(rule => typeof rule !== "string" || !parseRule(rule)))) return remappings;
  const explicit = (remappings ?? []).map(parseRule);
  const units = Object.keys(sources);
  const queue = [...units];
  const imports = new Map();
  const suppliedKeys = new Set(units.map(openZeppelin).filter(Boolean).map(pkg => `${pkg.version}:${pkg.key}`));
  const readImports = unit => {
    if (!imports.has(unit)) imports.set(unit, [...solidityImports(sources[unit].content)].map(path => relativeUnit(unit, path)));
    return imports.get(unit);
  };
  const requests = [];
  for (const unit of units) {
    for (const path of readImports(unit)) {
      const chosen = matchRule(explicit, unit, path);
      const target = chosen ? chosen.target + path.slice(chosen.prefix.length) : path;
      if (!owns(sources, target)) {
        const pkg = openZeppelin(target);
        if (pkg && !suppliedKeys.has(`${pkg.version}:${pkg.key}`)) requests.push(pkg);
      }
    }
  }

  const bundled = new Map();
  async function bundle(version) {
    if (!bundled.has(version)) bundled.set(version, await loadBundle(version));
    return bundled.get(version);
  }
  let preferred = release || current;
  if (!release && requests.some(pkg => !pkg.version)) {
    const modern = await bundle(current);
    const undecided = requests.filter(pkg => !pkg.version);
    const missing = undecided.filter(pkg => !owns(modern, pkg.key));
    if (missing.length) {
      const old = await bundle(legacy);
      const modernOnly = undecided.some(pkg => owns(modern, pkg.key) && !owns(old, pkg.key));
      const legacyOnly = missing.some(pkg => owns(old, pkg.key));
      if (legacyOnly && !modernOnly) preferred = legacy;
    }
  }

  const packageRoots = installedRoots(units);
  function packageRoot(name, version = preferred) {
    const pinned = version === preferred ? "" : `@${version}`;
    const prefix = `${name}${pinned}/`;
    if (units.some(unit => unit.startsWith(prefix))) return prefix;
    return packageRoots.get(prefix) ?? `node_modules/${prefix}`;
  }
  const potential = [];
  function addRule(context, prefix, target, preserveExact = true) {
    if (prefix === target ||
        explicit.some(rule => prefix.startsWith(rule.prefix) || rule.prefix.startsWith(prefix)) ||
        (preserveExact && units.some(unit => unit.startsWith(prefix) && unit !== target + unit.slice(prefix.length)))) return;
    potential.push({ context, prefix, target, rule: `${context || prefix.includes(":") ? `${context}:` : ""}${prefix}=${target}` });
  }

  for (const { name, version, prefix } of aliases) addRule("", prefix, packageRoot(name, version || preferred));
  for (const [prefix, root] of packageRoots) {
    if (!root || packages.some(name => prefix === `${name}/` || prefix.startsWith(`${name}@`))) continue;
    addRule("", prefix, root);
    addRule("", `node_modules/${prefix}`, root);
  }
  for (const version of [current, legacy]) {
    if (version === preferred) continue;
    addRule(packageRoot(packages[1], version), `${packages[0]}/`, packageRoot(packages[0], version), false);
  }
  if (!release && preferred === current && bundled.has(legacy)) {
    if (requests.some(pkg => !pkg.version && pkg.name === packages[0] && pkg.file === safeMath)) {
      for (const prefix of aliasesFor(packages[0], "")) {
        addRule("", prefix + safeMath, packageRoot(packages[0], legacy) + safeMath);
      }
    }
  }

  const supplied = new Map();
  const uploadedPackages = new Map();
  const suffix = new Map();
  const addUnique = (map, key, unit) => {
    if (!map.has(key)) map.set(key, unit);
    else if (map.get(key) !== unit) map.set(key, null);
  };
  for (const unit of units) {
    const pkg = openZeppelin(unit);
    if (pkg) {
      const version = pkg.version || preferred;
      addUnique(supplied, `${version}:${pkg.key}`, unit);
      const group = `${version}:${pkg.name}`;
      if (!uploadedPackages.has(group)) uploadedPackages.set(group, []);
      uploadedPackages.get(group).push([pkg.key, sources[unit].content]);
    } else {
      const parts = unit.split("/");
      for (let offset = 1; offset < parts.length; offset++) addUnique(suffix, parts.slice(offset).join("/"), unit);
    }
  }
  const canFill = new Map();
  async function resolve(target) {
    const pkg = openZeppelin(target);
    if (!pkg) {
      const unit = suffix.get(target);
      return unit ? sources[unit] : undefined;
    }
    const version = pkg.version || preferred;
    const key = `${version}:${pkg.key}`;
    if (supplied.has(key)) return sources[supplied.get(key)] ?? undefined;
    const files = await bundle(version);
    const group = `${version}:${pkg.name}`;
    if (!canFill.has(group)) {
      canFill.set(group, (uploadedPackages.get(group) ?? []).every(([name, content]) => files[name] === content));
    }
    if (!canFill.get(group)) return undefined;
    if (owns(files, pkg.key)) return { content: files[pkg.key] };
    if (!release && !pkg.version && version === current && pkg.name === packages[0] && pkg.file === safeMath && bundled.has(legacy)) {
      return { content: bundled.get(legacy)[pkg.key] };
    }
    return undefined;
  }

  const used = new Set();
  for (let i = 0; i < queue.length; i++) {
    const unit = queue[i];
    for (const path of readImports(unit)) {
      const explicitRule = matchRule(explicit, unit, path);
      const automatic = explicitRule ? null : matchRule(potential, unit, path);
      const rule = explicitRule ?? automatic;
      const target = rule ? rule.target + path.slice(rule.prefix.length) : path;
      if (automatic) used.add(automatic);
      if (owns(sources, target)) continue;
      const source = await resolve(target);
      if (!source) continue;
      if (queue.length >= units.length + 768) throw new Error("Too many resolved Solidity imports");
      sources[target] = source;
      queue.push(target);
    }
  }
  const automatic = potential.filter(rule => used.has(rule)).map(rule => rule.rule);
  return automatic.length ? [...(remappings ?? []), ...automatic] : remappings;
}
