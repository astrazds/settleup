import {
  currencyCodeSchema,
  type CurrencyCode,
  type ExpenseCommand,
  type ParticipantCommand,
  type PaymentCommand,
} from "@settleup/contracts";

import { parseAmountMinor } from "./money";

export interface EventSubmission<Command> {
  command: Command;
  expectedVersion: number;
}

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

export function readExpenseSubmission(formData: FormData): EventSubmission<ExpenseCommand> {
  return {
    command: {
      description: readFormString(formData, "description"),
      amountMinor: parseAmountMinor(
        readFormString(formData, "amount"),
        readFormCurrency(formData),
      ),
      payerId: readFormString(formData, "payerId"),
      includedParticipantIds: readFormStrings(
        formData,
        "includedParticipantIds",
      ),
    },
    expectedVersion: readFormVersion(formData),
  };
}

export function readPaymentSubmission(formData: FormData): EventSubmission<PaymentCommand> {
  return {
    command: {
      from: readFormString(formData, "from"),
      to: readFormString(formData, "to"),
      amountMinor: parseAmountMinor(
        readFormString(formData, "amount"),
        readFormCurrency(formData),
      ),
    },
    expectedVersion: readFormVersion(formData),
  };
}

export function readParticipantSubmission(formData: FormData): EventSubmission<ParticipantCommand> {
  return {
    command: {
      name: readFormString(formData, "name"),
    },
    expectedVersion: readFormVersion(formData),
  };
}
