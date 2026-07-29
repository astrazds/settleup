import { z } from "zod";

export const currencyCodes = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;

const requestObjectError = "Request body must be a JSON object.";
const currencyError = "currency must be one of AUD, USD, EUR, GBP, or NZD.";

function requiredTrimmedString(field: string) {
  return z
    .string({ error: `${field} must be a string.` })
    .trim()
    .min(1, { error: `${field} is required.` });
}

function positiveInteger(field: string) {
  const error = `${field} must be a positive integer.`;
  return z.int({ error }).positive({ error });
}

function stringArray(field: string) {
  const error = `${field} must be an array of strings.`;
  return z.array(z.string({ error }), { error });
}

const integerSchema = z.int();
const nonnegativeIntegerSchema = integerSchema.nonnegative();
const positiveIntegerSchema = integerSchema.positive();

export const currencyCodeSchema = z.enum(currencyCodes);
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const eventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  currency: currencyCodeSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  cleanupAfter: z.string(),
  version: positiveIntegerSchema,
  token: z.string(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;

export const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: nonnegativeIntegerSchema,
});
export type Participant = z.infer<typeof participantSchema>;

export const expenseShareSchema = z.object({
  participantId: z.string(),
  amountMinor: nonnegativeIntegerSchema,
});
export type ExpenseShare = z.infer<typeof expenseShareSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amountMinor: positiveIntegerSchema,
  payerId: z.string(),
  shares: z.array(expenseShareSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const settlementPaymentSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  amountMinor: positiveIntegerSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SettlementPayment = z.infer<typeof settlementPaymentSchema>;

export const balanceSchema = z.object({
  participantId: z.string(),
  paidMinor: nonnegativeIntegerSchema,
  owedMinor: nonnegativeIntegerSchema,
  netMinor: integerSchema,
});
export type Balance = z.infer<typeof balanceSchema>;

export const settlementSuggestionSchema = z.object({
  from: z.string(),
  to: z.string(),
  amountMinor: positiveIntegerSchema,
});
export type SettlementSuggestion = z.infer<typeof settlementSuggestionSchema>;

export const eventSnapshotSchema = z.object({
  event: eventSummarySchema,
  participants: z.array(participantSchema),
  expenses: z.array(expenseSchema),
  payments: z.array(settlementPaymentSchema),
  balances: z.array(balanceSchema),
  settlementSuggestion: settlementSuggestionSchema.nullable(),
});
export type EventSnapshot = z.infer<typeof eventSnapshotSchema>;

export const createEventCommandSchema = z.object(
  {
    title: requiredTrimmedString("title"),
    currency: z.enum(currencyCodes, { error: currencyError }),
    firstParticipantName: requiredTrimmedString("firstParticipantName"),
  },
  { error: requestObjectError },
);
export type CreateEventCommand = z.infer<typeof createEventCommandSchema>;

export const participantCommandSchema = z.object(
  {
    name: requiredTrimmedString("name"),
  },
  { error: requestObjectError },
);
export type ParticipantCommand = z.infer<typeof participantCommandSchema>;

export const expenseCommandSchema = z.object(
  {
    description: requiredTrimmedString("description"),
    amountMinor: positiveInteger("amountMinor"),
    payerId: requiredTrimmedString("payerId"),
    includedParticipantIds: stringArray("includedParticipantIds")
      .min(1, { error: "At least one participant must be included." })
      .refine(
        (participantIds) =>
          new Set(participantIds).size === participantIds.length,
        {
          error: "includedParticipantIds must not contain duplicates.",
        },
      ),
  },
  { error: requestObjectError },
);
export type ExpenseCommand = z.infer<typeof expenseCommandSchema>;

export const paymentCommandSchema = z.object(
  {
    from: requiredTrimmedString("from"),
    to: requiredTrimmedString("to"),
    amountMinor: positiveInteger("amountMinor"),
  },
  { error: requestObjectError },
);
export type PaymentCommand = z.infer<typeof paymentCommandSchema>;

export const createEventResponseSchema = z.object({
  token: z.string(),
  snapshot: eventSnapshotSchema,
});
export type CreateEventResponse = z.infer<typeof createEventResponseSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const connectedEventDataSchema = z.object({});
export type ConnectedEventData = z.infer<typeof connectedEventDataSchema>;

export const changedEventDataSchema = z.object({
  version: positiveIntegerSchema,
});
export type ChangedEventData = z.infer<typeof changedEventDataSchema>;
