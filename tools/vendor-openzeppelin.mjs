import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const version = "4.9.6";
const scope = resolve(process.argv[2] ?? "node_modules/@openzeppelin");
const entries = [];
const excluded = new Set(["crosschain", "vendor/arbitrum"]);

function collect(root, pkg, directory = "") {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (excluded.has(path)) continue;
    if (entry.isDirectory() && entry.name !== "build") collect(root, pkg, path);
    if (entry.isFile() && entry.name.endsWith(".sol")) {
      entries.push([`${pkg}/${path}`, readFileSync(join(root, path), "utf8")]);
    }
  }
}

for (const name of ["contracts", "contracts-upgradeable"]) {
  const root = join(scope, name);
  const pkg = `@openzeppelin/${name}`;
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (manifest.name !== pkg || manifest.version !== version) throw new Error(`Expected ${pkg}@${version}`);
  collect(root, pkg);
}

entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
writeFileSync(new URL(`../dist/compiler/openzeppelin-${version}.json`, import.meta.url),
  `${JSON.stringify(Object.fromEntries(entries))}\n`);
