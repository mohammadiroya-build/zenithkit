const version = "5.0.2";
const packages = ["@openzeppelin/contracts", "@openzeppelin/contracts-upgradeable"];
const packageAliases = packages.flatMap((name) => [
  [`${name}@${version}/`, `${name}/`],
  [`node_modules/${name}@${version}/`, `${name}/`],
  [`node_modules/${name}/`, `${name}/`],
]);

const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const installed = (path) => path.replace(/^(?:[^/]+\/)*?node_modules\//, "");
const stripPin = (path) => {
  for (const name of packages) {
    const pin = `${name}@${version}/`;
    if (path.startsWith(pin)) return `${name}/${path.slice(pin.length)}`;
  }
  return path;
};
const packageOf = (path) => packages.find((name) => path.startsWith(`${name}/`));

function modifiedPackages(sources, bundled) {
  const modified = new Set();
  for (const [path, source] of Object.entries(sources)) {
    const key = installed(path);
    const name = packageOf(key);
    if (name && owns(bundled, key) && bundled[key] !== source.content) modified.add(name);
  }
  return modified;
}

export function importRemappings(existing, sources, bundled) {
  if (existing !== undefined && (!Array.isArray(existing) || existing.some((entry) => typeof entry !== "string"))) {
    return existing;
  }
  const rules = existing ?? [];
  const prefixes = rules.map((entry) => entry.split("=", 1)[0].split(":").pop());
  const modified = modifiedPackages(sources, bundled);
  const pinnedOverrides = new Set();
  for (const [path, source] of Object.entries(sources)) {
    const key = installed(path);
    const canonical = stripPin(key);
    if (canonical !== key && (!owns(bundled, canonical) || bundled[canonical] !== source.content)) {
      pinnedOverrides.add(packageOf(canonical));
    }
  }
  const defaults = packageAliases
    .filter(([alias]) => !prefixes.some((prefix) => alias.startsWith(prefix) || prefix.startsWith(alias)))
    .filter(([alias, canonical]) => !alias.includes(`@${version}/`) ||
      (!modified.has(packageOf(canonical)) && !pinnedOverrides.has(packageOf(canonical))))
    .map(([alias, canonical]) => `${alias}=${canonical}`);
  return defaults.length ? [...rules, ...defaults] : existing;
}

export function solidityImportResolver(sources, bundled) {
  const units = Object.keys(sources);
  const sourceKey = (path) => {
    const name = installed(path);
    if (name.startsWith("openzeppelin-ide/")) return `${packages[0]}/${name.slice("openzeppelin-ide/".length)}`;
    return name;
  };
  const upstream = modifiedPackages(sources, bundled);
  const explicit = new Map();
  const suffixes = new Map();
  const add = (index, key, path) => {
    if (!index.has(key)) index.set(key, path);
    else if (sources[index.get(key)]?.content !== sources[path].content) index.set(key, null);
  };
  for (const unit of units) {
    const key = sourceKey(unit);
    add(explicit, key, unit);
    if (!key.startsWith("@openzeppelin/")) {
      const parts = key.split("/");
      for (let offset = 1; offset < parts.length; offset++) {
        add(suffixes, parts.slice(offset).join("/"), unit);
      }
    }
  }
  return (path) => {
    const key = sourceKey(path);
    const upload = explicit.get(key);
    if (explicit.has(key)) return upload === null ? undefined : sources[upload];
    const canonical = stripPin(key);
    const packageName = packageOf(canonical);
    if (packageName && owns(bundled, canonical) && (canonical !== key || !upstream.has(packageName))) {
      return { content: bundled[canonical] };
    }
    if (packageName || key.startsWith("@openzeppelin/")) return undefined;
    const suffix = suffixes.get(key);
    return suffix ? sources[suffix] : undefined;
  };
}
