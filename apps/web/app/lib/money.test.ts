import type { MoneyInputError } from "./money";
import {
  amountMinorToDecimal,
  currencyFractionDigits,
  formatMoney,
  parseAmountMinor,
  splitAmountMinorEqually,
} from "./money";

describe("money helpers", () => {
  it.each(["AUD", "USD", "EUR", "GBP", "NZD"] as const)(
    "uses two minor-unit digits for %s",
    (currency) => {
      expect(currencyFractionDigits(currency)).toBe(2);
    },
  );

  it("parses decimal strings exactly without floating-point multiplication", () => {
    expect(parseAmountMinor("0.29", "AUD")).toBe(29);
    expect(parseAmountMinor(".5", "AUD")).toBe(50);
    expect(parseAmountMinor("12", "AUD")).toBe(1_200);
    expect(parseAmountMinor("12.3", "AUD")).toBe(1_230);
    expect(parseAmountMinor("12,3", "EUR")).toBe(1_230);
    expect(parseAmountMinor("00012.30", "AUD")).toBe(1_230);
    expect(parseAmountMinor("90071992547409.91", "AUD")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it.each([
    ["", "required"],
    ["0", "positive"],
    ["-1.00", "format"],
    ["1.001", "precision"],
    ["1,001", "precision"],
    ["90071992547409.92", "range"],
  ] as const)("rejects %j with reason %s", (input, reason) => {
    expect(() => parseAmountMinor(input, "AUD")).toThrowError(
      expect.objectContaining<Partial<MoneyInputError>>({ reason }),
    );
  });

  it("converts safe minor-unit integers back to canonical decimal strings", () => {
    expect(amountMinorToDecimal(29, "AUD")).toBe("0.29");
    expect(amountMinorToDecimal(1_230, "AUD")).toBe("12.30");
    expect(amountMinorToDecimal(-1_230, "AUD")).toBe("-12.30");
    expect(amountMinorToDecimal(Number.MAX_SAFE_INTEGER, "AUD")).toBe(
      "90071992547409.91",
    );
  });

  it("rejects non-integer or unsafe minor-unit values", () => {
    expect(() => amountMinorToDecimal(1.2, "AUD")).toThrow(RangeError);
    expect(() =>
      amountMinorToDecimal(Number.MAX_SAFE_INTEGER + 1, "AUD"),
    ).toThrow(RangeError);
  });

  it("formats exact positive, negative, and zero values for display", () => {
    expect(formatMoney(1_234, "AUD", "en-AU")).toBe("$12.34");
    expect(formatMoney(-1_234, "USD", "en-US")).toBe("-$12.34");
    expect(formatMoney(0, "GBP", "en-GB")).toBe("£0.00");
    expect(formatMoney(1_234, "EUR", "de-DE")).toContain("12,34");
    expect(formatMoney(9_007_199_254_740_992n, "AUD", "en-AU")).toBe(
      "$90,071,992,547,409.92",
    );
  });

  it("previews the server's deterministic equal-cent split", () => {
    expect(splitAmountMinorEqually(1_000, 3)).toEqual([334, 333, 333]);
    expect(splitAmountMinorEqually(1, 2)).toEqual([1, 0]);
    expect(splitAmountMinorEqually(100, 0)).toEqual([]);
  });
});
