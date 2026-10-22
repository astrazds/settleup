import { describe, expect, it } from "vitest";

import { deriveEqualShares } from "./shares.js";

describe("deriveEqualShares", () => {
  it("gives leftover cents to the earliest participant ids", () => {
    expect(deriveEqualShares(1_000, ["a", "b", "c"])).toEqual([
      { participantId: "a", amountMinor: 334 },
      { participantId: "b", amountMinor: 333 },
      { participantId: "c", amountMinor: 333 },
    ]);
    expect(deriveEqualShares(1, ["a", "b"])).toEqual([
      { participantId: "a", amountMinor: 1 },
      { participantId: "b", amountMinor: 0 },
    ]);
    expect(deriveEqualShares(2_001, ["mia", "noah"])).toEqual([
      { participantId: "mia", amountMinor: 1_001 },
      { participantId: "noah", amountMinor: 1_000 },
    ]);
  });

  it("rejects an empty participant list", () => {
    expect(() => deriveEqualShares(100, [])).toThrow(
      "At least one participant must be included.",
    );
  });
});
