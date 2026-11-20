import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const advisory = "GHSA-g3hv-75wg-m249";
const patched = "11.0.1";

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isAffectedMinimatch(version) {
  return compareVersions(version, "7.0.0") >= 0 && compareVersions(version, patched) < 0;
}

function isMinimatchPath(path, name) {
  return name === "minimatch" || path === "node_modules/minimatch" || path.endsWith("/minimatch");
}

export function minimatchViolations(lock) {
  const packages = lock.packages ?? {};
  const violations = [];
  for (const [path, meta] of Object.entries(packages)) {
    if (!isMinimatchPath(path, meta?.name ?? "")) continue;
    const version = meta?.version;
    if (!version || !isAffectedMinimatch(version)) continue;
    violations.push(
      `package-lock.json ${path} resolves minimatch ${version}, inside ${advisory} (>=7.0.0 <${patched}). Resolve minimatch ${patched} or later in package-lock.json.`,
    );
  }
  return violations;
}

export function checkLockfile(root = process.cwd()) {
  const text = readFileSync(join(root, "package-lock.json"), "utf8");
  return minimatchViolations(JSON.parse(text));
}

function isDirectRun() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const violations = checkLockfile(process.env.CHECK_ROOT ?? process.cwd());
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exit(1);
  }
}
