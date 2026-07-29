import {
  currencyCodes,
  type CurrencyCode,
} from "@settleup/contracts";

const CURRENCY_BY_REGION: Readonly<Record<string, CurrencyCode>> = {
  AD: "EUR",
  AT: "EUR",
  AU: "AUD",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GB: "GBP",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MC: "EUR",
  MT: "EUR",
  NL: "EUR",
  NZ: "NZD",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
  SM: "EUR",
  US: "USD",
  VA: "EUR",
};

const FALLBACK_CURRENCY: CurrencyCode = "AUD";

export function defaultCurrencyForLocales(
  locales: readonly string[] = browserLocales(),
): CurrencyCode {
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).maximize().region;
      if (region) {
        const currency = CURRENCY_BY_REGION[region.toUpperCase()];
        if (currency && currencyCodes.includes(currency)) {
          return currency;
        }
      }
    } catch {
      // Ignore malformed browser locale entries and try the next locale.
    }
  }

  return FALLBACK_CURRENCY;
}

function browserLocales(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  if (navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
}
