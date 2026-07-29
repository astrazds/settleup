import { defaultCurrencyForLocales } from "./currency";

describe("defaultCurrencyForLocales", () => {
  it.each([
    ["en-AU", "AUD"],
    ["en-US", "USD"],
    ["en-GB", "GBP"],
    ["en-NZ", "NZD"],
    ["de-DE", "EUR"],
    ["fr-FR", "EUR"],
  ] as const)("maps %s to %s", (locale, currency) => {
    expect(defaultCurrencyForLocales([locale])).toBe(currency);
  });

  it("tries later locales when an earlier region has no supported currency", () => {
    expect(defaultCurrencyForLocales(["fr-CA", "en-NZ"])).toBe("NZD");
  });

  it("falls back to AUD for empty or malformed locale lists", () => {
    expect(defaultCurrencyForLocales([])).toBe("AUD");
    expect(defaultCurrencyForLocales(["%%%"])).toBe("AUD");
  });
});
