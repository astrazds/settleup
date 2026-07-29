export function readFormString(
  formData: FormData,
  key: string,
  fallback = "",
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

export function readFormStrings(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

export function readFormCurrency(
  formData: FormData,
  key = "currency",
): CurrencyCode {
  const result = currencyCodeSchema.safeParse(readFormString(formData, key));
  if (!result.success) {
    throw new Error("Choose a supported currency.");
  }

  return result.data;
}

export function readFormVersion(
  formData: FormData,
  key = "eventVersion",
): number {
  const value = readFormString(formData, key);
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("The event version is invalid. Reload and try again.");
  }

  const version = Number(value);
  if (!Number.isSafeInteger(version)) {
    throw new Error("The event version is invalid. Reload and try again.");
  }

  return version;
}
import {
  currencyCodeSchema,
  type CurrencyCode,
} from "@settleup/contracts";
