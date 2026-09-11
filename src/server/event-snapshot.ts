import type {
  EventSnapshot,
  EventSummary,
  Expense,
  Participant,
  SettlementPayment,
} from "@settleup/contracts";

import { readIntegerField, readStringField, type SqliteDatabase } from "./database.js";
import { calculateBalances, getSettlementSuggestion } from "./ledger.js";

export type EventRecord = Omit<EventSummary, "token">;
export interface AmountExclusion {
  kind: "expense" | "payment";
  id: string;
}

type ExpenseRow = Omit<Expense, "shares">;
interface ShareRow {
  expenseId: string;
  participantId: string;
  amountMinor: number;
}

export const maximumExactEventAmountMinor = BigInt(Number.MAX_SAFE_INTEGER);

export function assertStoredAmountSafe(totalMinor: bigint): void {
  if (totalMinor > maximumExactEventAmountMinor) {
    throw new Error("Stored event amounts exceed the exact safe-integer range.");
  }
}

export function loadEventSnapshot(db: SqliteDatabase, event: EventRecord, token: string): EventSnapshot {
  const participants = loadParticipants(db, event.id);
  const expenses = loadExpenses(db, event.id);
  const payments = loadPayments(db, event.id);
  let totalMinor = 0n;
  for (const item of [...expenses, ...payments]) {
    totalMinor += BigInt(item.amountMinor);
  }
  assertStoredAmountSafe(totalMinor);
  const balances = calculateBalances(participants, expenses, payments);

  return {
    event: { ...event, token },
    participants,
    expenses,
    payments,
    balances,
    settlementSuggestion: getSettlementSuggestion(balances),
  };
}

function loadParticipants(db: SqliteDatabase, eventId: string): Participant[] {
  return db
    .prepare(
      `
      SELECT id, name, sort_order AS sortOrder
      FROM participants
      WHERE event_id = ?
      ORDER BY sort_order ASC
    `,
    )
    .all(eventId)
    .map(parseParticipantRow);
}

function loadExpenses(db: SqliteDatabase, eventId: string): Expense[] {
  const expenseRows = db
    .prepare(
      `
      SELECT
        id,
        description,
        amount_minor AS amountMinor,
        payer_participant_id AS payerId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM expenses
      WHERE event_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(eventId)
    .map(parseExpenseRow);

  const shareRows = db
    .prepare(
      `
      SELECT
        expense_id AS expenseId,
        participant_id AS participantId,
        amount_minor AS amountMinor
      FROM expense_shares
      WHERE expense_id IN (${expenseRows.map(() => "?").join(",") || "NULL"})
    `,
    )
    .all(...expenseRows.map((expense) => expense.id))
    .map(parseShareRow);

  return expenseRows.map((expense) => ({
    ...expense,
    shares: shareRows
      .filter((share) => share.expenseId === expense.id)
      .map(({ participantId, amountMinor }) => ({ participantId, amountMinor })),
  }));
}

function loadPayments(db: SqliteDatabase, eventId: string): SettlementPayment[] {
  return db
    .prepare(
      `
      SELECT
        id,
        from_participant_id AS "from",
        to_participant_id AS "to",
        amount_minor AS amountMinor,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM settlement_payments
      WHERE event_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(eventId)
    .map(parsePaymentRow);
}

export function readEventAmountTotal(
  db: SqliteDatabase,
  eventId: string,
  exclusion?: AmountExclusion,
): bigint {
  const excludedExpenseId = exclusion?.kind === "expense" ? exclusion.id : null;
  const excludedPaymentId = exclusion?.kind === "payment" ? exclusion.id : null;
  let totalMinor = 0n;
  const expenseRows = db
    .prepare(
      `
      SELECT amount_minor AS amountMinor
      FROM expenses
      WHERE event_id = ? AND (? IS NULL OR id <> ?)
    `,
    )
    .all(
      eventId,
      excludedExpenseId,
      excludedExpenseId,
    );
  const paymentRows = db
    .prepare(
      `
      SELECT amount_minor AS amountMinor
      FROM settlement_payments
      WHERE event_id = ? AND (? IS NULL OR id <> ?)
    `,
    )
    .all(
      eventId,
      excludedPaymentId,
      excludedPaymentId,
    );

  for (const row of [...expenseRows, ...paymentRows]) {
    totalMinor += BigInt(readIntegerField(row, "amountMinor"));
  }

  return totalMinor;
}

function parseParticipantRow(row: unknown): Participant {
  return {
    id: readStringField(row, "id"),
    name: readStringField(row, "name"),
    sortOrder: readIntegerField(row, "sortOrder"),
  };
}

function parseExpenseRow(row: unknown): ExpenseRow {
  return {
    id: readStringField(row, "id"),
    description: readStringField(row, "description"),
    amountMinor: readIntegerField(row, "amountMinor"),
    payerId: readStringField(row, "payerId"),
    createdAt: readStringField(row, "createdAt"),
    updatedAt: readStringField(row, "updatedAt"),
  };
}

function parseShareRow(row: unknown): ShareRow {
  return {
    expenseId: readStringField(row, "expenseId"),
    participantId: readStringField(row, "participantId"),
    amountMinor: readIntegerField(row, "amountMinor"),
  };
}

function parsePaymentRow(row: unknown): SettlementPayment {
  return {
    id: readStringField(row, "id"),
    from: readStringField(row, "from"),
    to: readStringField(row, "to"),
    amountMinor: readIntegerField(row, "amountMinor"),
    createdAt: readStringField(row, "createdAt"),
    updatedAt: readStringField(row, "updatedAt"),
  };
}
