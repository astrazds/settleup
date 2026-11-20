import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const file = "apps/web/DESIGN.md";
const lengthPattern = /\d+(?:\.\d+)?(?:px|rem|em)\b|clamp\s*\(/g;

export function designLengthViolations(text, filePath = file) {
  const violations = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const matches = lines[index].match(lengthPattern);
    if (!matches) continue;
    violations.push(
      `${filePath}:${index + 1} restates stylesheet length ${matches.join(", ")}. Measurements belong in the CSS module listed in the Implementation owners table in apps/web/DESIGN.md. Remove the px, rem, em, or clamp value from apps/web/DESIGN.md.`,
    );
  }
  return violations;
}

export function checkDesignDoc(root = process.cwd()) {
  const text = readFileSync(join(root, file), "utf8");
  return designLengthViolations(text);
}

function isDirectRun() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const violations = checkDesignDoc(process.env.CHECK_ROOT ?? process.cwd());
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exit(1);
  }
}
