import type { CurrencyCode } from "@settleup/contracts";

export type MoneyInputErrorReason =
  | "required"
  | "format"
  | "precision"
  | "positive"
  | "range";

export class MoneyInputError extends Error {
  readonly reason: MoneyInputErrorReason;

  constructor(reason: MoneyInputErrorReason, message: string) {
    super(message);
    this.name = "MoneyInputError";
    this.reason = reason;
  }
}

const FRACTION_DIGITS: Readonly<Record<CurrencyCode, number>> = {
  AUD: 2,
  EUR: 2,
  GBP: 2,
  NZD: 2,
  USD: 2,
};

export function currencyFractionDigits(currency: CurrencyCode): number {
  return FRACTION_DIGITS[currency];
}

export function parseAmountMinor(input: string, currency: CurrencyCode): number {
  const value = input.trim();

  if (!value) {
    throw new MoneyInputError("required", "Enter an amount.");
  }

  const match = /^(?:(\d+)(?:[.,](\d*))?|[.,](\d+))$/.exec(value);
  if (!match) {
    throw new MoneyInputError(
      "format",
      "Enter an amount using digits and a decimal point or comma.",
    );
  }

  const fractionDigits = currencyFractionDigits(currency);
  const providedFraction = match[2] ?? match[3] ?? "";

  if (providedFraction.length > fractionDigits) {
    throw new MoneyInputError(
      "precision",
      `Enter no more than ${fractionDigits} decimal places.`,
    );
  }

  const major = stripLeadingZeroes(match[1] ?? "0");
  const fraction = providedFraction.padEnd(fractionDigits, "0");
  const combinedDigits = stripLeadingZeroes(`${major}${fraction}`);
  const amount = BigInt(combinedDigits || "0");

  if (amount <= 0n) {
    throw new MoneyInputError("positive", "Enter an amount greater than zero.");
  }

  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyInputError("range", "That amount is too large.");
  }

  return Number(amount);
}

export function amountMinorToDecimal(
  amountMinor: number | bigint,
  currency: CurrencyCode,
): `${number}` {
  const amount = typeof amountMinor === "bigint" ? amountMinor : BigInt(assertSafeMinorUnits(amountMinor));
  const fractionDigits = currencyFractionDigits(currency);
  const sign = amount < 0n ? "-" : "";
  const digits = (amount < 0n ? -amount : amount).toString().padStart(fractionDigits + 1, "0");
  const splitAt = digits.length - fractionDigits;
  const decimal = fractionDigits === 0
    ? digits
    : `${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`;
  // Both parts come from an integer. Preserve its digits at the Intl boundary.
  return `${sign}${decimal}` as `${number}`;
}

const defaultFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

export function formatMoney(
  amountMinor: bigint | number,
  currency: CurrencyCode,
  locales?: string | readonly string[],
): string {
  let formatter = locales === undefined ? defaultFormatters.get(currency) : undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, { style: "currency", currency });
    if (locales === undefined) {
      defaultFormatters.set(currency, formatter);
    }
  }
  return formatter.format(amountMinorToDecimal(amountMinor, currency));
}

function stripLeadingZeroes(value: string): string {
  return value.replace(/^0+(?=\d)/, "");
}

function assertSafeMinorUnits(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError("Amount must be a safe integer minor-unit value.");
  }

  return amountMinor;
}
