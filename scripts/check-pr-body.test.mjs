import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyViolations,
  commitMessageViolations,
  cursorTrailer,
  footerMarker,
} from "./check-pr-body.mjs";

test("a pull request body with the agent footer marker fails", () => {
  const violations = bodyViolations(`Summary\n${footerMarker}\n`);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /agent footer marker \(CURSOR_AGENT_PR_BODY\)/);
  assert.match(violations[0], /Remove the footer/);
});

test("an ordinary pull request body passes", () => {
  assert.deepEqual(bodyViolations("Explain the change and the check you ran."), []);
});

test("f00d012 Cursor agent trailer fails", () => {
  const message = [
    "docs(web): drop the fixed register width from the layout note (#8)",
    "",
    "The note claimed a 240px desktop register.",
    "",
    cursorTrailer,
    "Co-authored-by: Andrejs Strazds <astrazds@users.noreply.github.com>",
  ].join("\n");
  const violations = commitMessageViolations(message, "f00d012");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /f00d012 contains "Co-authored-by: Cursor Agent <cursoragent@cursor.com>"/);
  assert.match(violations[0], /Commit as Andrejs Strazds/);
});

test("a dependabot trailer is not a Cursor agent signature", () => {
  const message = "Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>\n";
  assert.deepEqual(commitMessageViolations(message, "2adefc1"), []);
});
