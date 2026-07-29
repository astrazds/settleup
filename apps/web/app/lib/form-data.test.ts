import {
  readFormCurrency,
  readFormString,
  readFormStrings,
  readFormVersion,
} from "./form-data";

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
