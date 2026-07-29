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
  amountMinor: number,
  currency: CurrencyCode,
): string {
  assertSafeMinorUnits(amountMinor);

  const fractionDigits = currencyFractionDigits(currency);
  const sign = amountMinor < 0 ? "-" : "";
  const digits = Math.abs(amountMinor).toString().padStart(fractionDigits + 1, "0");

  if (fractionDigits === 0) {
    return `${sign}${digits}`;
  }

  const splitAt = digits.length - fractionDigits;
  return `${sign}${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`;
}

export function formatMoney(
  amountMinor: bigint | number,
  currency: CurrencyCode,
  locales?: string | readonly string[],
): string {
  const exactAmount =
    typeof amountMinor === "bigint"
      ? amountMinor
      : BigInt(assertSafeMinorUnits(amountMinor));

  const normalizedLocales =
    typeof locales === "string" || locales === undefined ? locales : [...locales];
  const fractionDigits = currencyFractionDigits(currency);
  const negative = exactAmount < 0n;
  const digits = (negative ? -exactAmount : exactAmount)
    .toString()
    .padStart(fractionDigits + 1, "0");
  const splitAt = digits.length - fractionDigits;
  const integerDigits = digits.slice(0, splitAt);
  const fraction = digits.slice(splitAt);
  const numericParts = new Intl.NumberFormat(normalizedLocales, {
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: "currency",
  }).formatToParts(negative ? -1 : 1);

  return numericParts
    .map((part) => {
      switch (part.type) {
        case "integer":
          return groupInteger(integerDigits, normalizedLocales);
        case "fraction":
          return fraction;
        case "minusSign":
          return negative ? part.value : "";
        default:
          return part.value;
      }
    })
    .join("");
}

export function splitAmountMinorEqually(
  amountMinor: number,
  participantCount: number,
): number[] {
  assertSafeMinorUnits(amountMinor);
  if (amountMinor <= 0 || !Number.isInteger(participantCount) || participantCount <= 0) {
    return [];
  }

  const baseShare = Math.floor(amountMinor / participantCount);
  const remainder = amountMinor % participantCount;

  return Array.from(
    { length: participantCount },
    (_, index) => baseShare + (index < remainder ? 1 : 0),
  );
}

function groupInteger(
  integerDigits: string,
  locales?: string | string[],
): string {
  const formatter = new Intl.NumberFormat(locales, {
    maximumFractionDigits: 0,
    useGrouping: true,
  });

  if (integerDigits.length < 16) {
    return formatter.format(Number(integerDigits));
  }

  const sentinel = "123456789012345";
  const sentinelParts = formatter.formatToParts(Number(sentinel));
  const groupSizes = sentinelParts
    .filter((part) => part.type === "integer")
    .map((part) => part.value.length);
  const separator =
    sentinelParts.find((part) => part.type === "group")?.value ?? ",";

  if (groupSizes.length < 2) {
    return integerDigits;
  }

  const primarySize = groupSizes.at(-1) ?? 3;
  const secondarySize = groupSizes.at(-2) ?? primarySize;
  const groups: string[] = [];
  let end = integerDigits.length;
  let size = primarySize;

  while (end > 0) {
    const start = Math.max(0, end - size);
    groups.unshift(integerDigits.slice(start, end));
    end = start;
    size = secondarySize;
  }

  return groups.join(separator);
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
