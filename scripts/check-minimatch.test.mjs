import assert from "node:assert/strict";
import test from "node:test";
import { checkLockfile, isAffectedMinimatch, minimatchViolations } from "./check-minimatch.mjs";

test("minimatch 10.2.6 from the partial advisory fix fails", () => {
  const violations = minimatchViolations({
    packages: {
      "node_modules/minimatch": { version: "10.2.6" },
      "node_modules/eslint/node_modules/minimatch": { version: "11.0.8" },
    },
  });
  assert.equal(violations.length, 1);
  assert.match(
    violations[0],
    /package-lock.json node_modules\/minimatch resolves minimatch 10\.2\.6, inside GHSA-g3hv-75wg-m249/,
  );
  assert.match(violations[0], /Resolve minimatch 11\.0\.1 or later in package-lock.json/);
});

test("patched and older minimatch lines pass", () => {
  assert.equal(isAffectedMinimatch("10.2.6"), true);
  assert.equal(isAffectedMinimatch("11.0.0"), true);
  assert.equal(isAffectedMinimatch("11.0.1"), false);
  assert.equal(isAffectedMinimatch("11.0.9"), false);
  assert.equal(isAffectedMinimatch("6.2.3"), false);
});

test("the lockfile on this branch resolves a patched minimatch", () => {
  assert.deepEqual(checkLockfile(), []);
});
