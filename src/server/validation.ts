import {
  assertCurrencyCode,
  type CurrencyCode,
} from "../shared/domain.js";
import { badRequest } from "./errors.js";

type JsonObject = Record<string, unknown>;

export function asObject(value: unknown): JsonObject {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }

  throw badRequest("Request body must be a JSON object.");
}

export function readString(body: JsonObject, key: string): string {
  const value = body[key];

  if (typeof value !== "string") {
    throw badRequest(`${key} must be a string.`);
  }

  return value;
}

export function readOptionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw badRequest(`${key} must be a string.`);
  }

  return value;
}

export function readStringArray(body: JsonObject, key: string): string[] {
  const value = body[key];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw badRequest(`${key} must be an array of strings.`);
  }

  return value;
}

export function readPositiveInteger(body: JsonObject, key: string): number {
  const value = body[key];

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw badRequest(`${key} must be a positive integer.`);
  }

  return value;
}

export function readCurrency(body: JsonObject): CurrencyCode {
  try {
    return assertCurrencyCode(readString(body, "currency"));
  } catch {
    throw badRequest("currency must be one of AUD, USD, EUR, GBP, or NZD.");
  }
}

export function trimRequired(value: string, field: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw badRequest(`${field} is required.`);
  }

  return trimmed;
}
