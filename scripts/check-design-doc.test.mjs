import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { designLengthViolations } from "./check-design-doc.mjs";

const reintroducedLengths = [
  '  control: "4px"',
  "The 1100px workspace has a ruled masthead, event title, metadata and three peer tabs.",
  "Inputs use 4px corners, a 1px border, and a 48px minimum height.",
  "Controls retain a 44px minimum target and visible focus.",
  "error announcements, reduced motion, 320px layouts, enlarged text, and short",
].join("\n");

test("lengths copied back into the design doc fail the check", () => {
  const violations = designLengthViolations(reintroducedLengths);
  assert.equal(violations.length, 5);
  for (const violation of violations) {
    assert.match(violation, /apps\/web\/DESIGN\.md:\d+ restates stylesheet length/);
    assert.match(violation, /Implementation owners table in apps\/web\/DESIGN\.md/);
  }
  assert.match(violations[0], /4px/);
  assert.match(violations[1], /1100px/);
});

test("the design doc on this branch does not restate stylesheet lengths", () => {
  const text = readFileSync(new URL("../apps/web/DESIGN.md", import.meta.url), "utf8");
  assert.deepEqual(designLengthViolations(text), []);
});
