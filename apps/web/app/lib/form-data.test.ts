import { deriveEqualShares } from "@settleup/contracts";

import { amountMinorToDecimal } from "./money";
import {
  includedParticipantIdsInSubmitOrder,
  previewStoredShares,
  readFormCurrency,
  readFormString,
  readFormStrings,
  readFormVersion,
} from "./form-data";

function checkedParticipantForm(
  participants: readonly { id: string }[],
  includedIds: readonly string[],
): FormData {
  const formData = new FormData();
  const included = new Set(includedIds);
  for (const participant of participants) {
    if (included.has(participant.id)) {
      formData.append("includedParticipantIds", participant.id);
    }
  }
  return formData;
}

describe("form data helpers", () => {
  it("reads strings without coercing file entries", () => {
    const formData = new FormData();
    formData.append("name", "Mia");
    formData.append("attachments", new File(["receipt"], "receipt.txt"));

    expect(readFormString(formData, "name")).toBe("Mia");
    expect(readFormString(formData, "attachments", "fallback")).toBe(
      "fallback",
    );
    expect(readFormStrings(formData, "attachments")).toEqual([]);
  });

  it("accepts only a supported currency code", () => {
    const valid = new FormData();
    valid.set("currency", "EUR");
    expect(readFormCurrency(valid)).toBe("EUR");

    const invalid = new FormData();
    invalid.set("currency", "CAD");
    expect(() => readFormCurrency(invalid)).toThrow(
      "Choose a supported currency.",
    );
  });

  it("previews the shares the server stores for submitted participant order", () => {
    const participants = [{ id: "mia" }, { id: "noah" }];
    const clickOrder = ["noah", "mia"];
    const postedIds = includedParticipantIdsInSubmitOrder(participants, clickOrder);

    expect(postedIds).toEqual(["mia", "noah"]);
    expect(readFormStrings(checkedParticipantForm(participants, clickOrder), "includedParticipantIds")).toEqual(
      postedIds,
    );

    const preview = previewStoredShares(2_001, participants, clickOrder);
    const stored = deriveEqualShares(2_001, postedIds);
    expect(preview).toEqual(stored);
    expect(preview).toEqual([
      { participantId: "mia", amountMinor: 1_001 },
      { participantId: "noah", amountMinor: 1_000 },
    ]);
    expect(amountMinorToDecimal(1_001, "AUD")).toBe("10.01");
    expect(preview).not.toEqual(deriveEqualShares(2_001, clickOrder));
  });

  it("accepts only a positive safe event version", () => {
    const formData = new FormData();
    formData.set("eventVersion", "12");
    expect(readFormVersion(formData)).toBe(12);

    for (const invalid of ["", "0", "-1", "1.5", "9007199254740992"]) {
      formData.set("eventVersion", invalid);
      expect(() => readFormVersion(formData)).toThrow(
        "The event version is invalid. Reload and try again.",
      );
    }
  });
});
