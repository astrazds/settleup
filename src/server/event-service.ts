import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  calculateBalances,
  deriveEqualShares,
  getSettlementSuggestion,
  participantColors,
  type CurrencyCode,
  type EventSnapshot,
  type Expense,
  type ExpenseShare,
  type Participant,
  type SettlementPayment,
} from "../shared/domain.js";
import { badRequest, expired, notFound } from "./errors.js";
import type { SqliteDatabase } from "./database.js";

const tokenAlphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const tokenLength = 14;
const eventLifetimeMs = 3 * 24 * 60 * 60 * 1000;
const cleanupLifetimeMs = 5 * 24 * 60 * 60 * 1000;

interface EventRow {
  id: string;
  title: string;
  currency: CurrencyCode;
  createdAt: string;
  expiresAt: string;
  cleanupAfter: string;
  version: number;
}

interface ParticipantRow {
  id: string;
  name: string;
  initials: string;
  color: Participant["color"];
  sortOrder: number;
}

interface ExpenseRow {
  id: string;
  description: string;
  amountMinor: number;
  payerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareRow {
  expenseId: string;
  participantId: string;
  amountMinor: number;
}

interface PaymentRow {
  id: string;
  from: string;
  to: string;
  amountMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventCommand {
  title: string;
  currency: CurrencyCode;
  firstParticipantName: string;
}

export interface ParticipantCommand {
  name: string;
}

export interface ExpenseCommand {
  description: string;
  amountMinor: number;
  payerId: string;
  includedParticipantIds: string[];
}

export interface PaymentCommand {
  from: string;
  to: string;
  amountMinor: number;
}

interface CreatedEvent {
  token: string;
  snapshot: EventSnapshot;
}

type NowProvider = () => Date;

export class EventService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly now: NowProvider = () => new Date(),
  ) {}

  createEvent(command: CreateEventCommand): CreatedEvent {
    const token = generateToken();
    const now = this.now();
    const createdAt = now.toISOString();
    const eventId = randomUUID();
    const participantId = randomUUID();
    const expiresAt = new Date(now.getTime() + eventLifetimeMs).toISOString();
    const cleanupAfter = new Date(now.getTime() + cleanupLifetimeMs).toISOString();

    const create = this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO events (id, token_hash, title, currency, created_at, expires_at, cleanup_after, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        )
        .run(
          eventId,
          hashToken(token),
          command.title,
          command.currency,
          createdAt,
          expiresAt,
          cleanupAfter,
        );

      this.db
        .prepare(
          `
          INSERT INTO participants (id, event_id, name, initials, color, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `,
        )
        .run(
          participantId,
          eventId,
          command.firstParticipantName,
          initialsFor(command.firstParticipantName),
          participantColors[0],
          createdAt,
          createdAt,
        );
    });

    create();
    return { token, snapshot: this.getSnapshotByToken(token) };
  }

  getSnapshotByToken(token: string): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    return this.loadSnapshot(event, token);
  }

  addParticipant(token: string, command: ParticipantCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    const createdAt = this.now().toISOString();
    const nextSortOrder = this.getNextParticipantSortOrder(event.id);
    const color = participantColors[nextSortOrder % participantColors.length];

    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO participants (id, event_id, name, initials, color, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          randomUUID(),
          event.id,
          command.name,
          initialsFor(command.name),
          color,
          nextSortOrder,
          createdAt,
          createdAt,
        );
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  renameParticipant(token: string, participantId: string, command: ParticipantCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requireParticipant(event.id, participantId);
    const updatedAt = this.now().toISOString();

    const write = this.db.transaction(() => {
      this.db
        .prepare("UPDATE participants SET name = ?, initials = ?, updated_at = ? WHERE id = ? AND event_id = ?")
        .run(command.name, initialsFor(command.name), updatedAt, participantId, event.id);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  deleteParticipant(token: string, participantId: string): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requireParticipant(event.id, participantId);

    if (this.isParticipantReferenced(participantId)) {
      throw badRequest("Only unreferenced participants can be deleted.");
    }

    const write = this.db.transaction(() => {
      this.db.prepare("DELETE FROM participants WHERE id = ? AND event_id = ?").run(participantId, event.id);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  createExpense(token: string, command: ExpenseCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    const expenseId = randomUUID();
    const now = this.now().toISOString();
    this.validateExpenseParticipants(event.id, command);
    const shares = deriveEqualShares(command.amountMinor, command.includedParticipantIds);

    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(expenseId, event.id, command.description, command.amountMinor, command.payerId, now, now);

      this.insertShares(expenseId, shares);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  updateExpense(token: string, expenseId: string, command: ExpenseCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requireExpense(event.id, expenseId);
    this.validateExpenseParticipants(event.id, command);
    const shares = deriveEqualShares(command.amountMinor, command.includedParticipantIds);
    const updatedAt = this.now().toISOString();

    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `
          UPDATE expenses
          SET description = ?, amount_minor = ?, payer_participant_id = ?, updated_at = ?
          WHERE id = ? AND event_id = ?
        `,
        )
        .run(command.description, command.amountMinor, command.payerId, updatedAt, expenseId, event.id);
      this.db.prepare("DELETE FROM expense_shares WHERE expense_id = ?").run(expenseId);
      this.insertShares(expenseId, shares);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  deleteExpense(token: string, expenseId: string): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requireExpense(event.id, expenseId);

    const write = this.db.transaction(() => {
      this.db.prepare("DELETE FROM expenses WHERE id = ? AND event_id = ?").run(expenseId, event.id);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  createPayment(token: string, command: PaymentCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    const paymentId = randomUUID();
    const now = this.now().toISOString();
    this.validatePaymentParticipants(event.id, command);

    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO settlement_payments
            (id, event_id, from_participant_id, to_participant_id, amount_minor, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(paymentId, event.id, command.from, command.to, command.amountMinor, now, now);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  updatePayment(token: string, paymentId: string, command: PaymentCommand): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requirePayment(event.id, paymentId);
    this.validatePaymentParticipants(event.id, command);
    const updatedAt = this.now().toISOString();

    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `
          UPDATE settlement_payments
          SET from_participant_id = ?, to_participant_id = ?, amount_minor = ?, updated_at = ?
          WHERE id = ? AND event_id = ?
        `,
        )
        .run(command.from, command.to, command.amountMinor, updatedAt, paymentId, event.id);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  deletePayment(token: string, paymentId: string): EventSnapshot {
    const event = this.getEventByToken(token);
    this.assertNotExpired(event);
    this.requirePayment(event.id, paymentId);

    const write = this.db.transaction(() => {
      this.db.prepare("DELETE FROM settlement_payments WHERE id = ? AND event_id = ?").run(paymentId, event.id);
      this.bumpVersion(event.id);
    });

    write();
    return this.getSnapshotByToken(token);
  }

  cleanupExpiredData(): number {
    const result = this.db
      .prepare("DELETE FROM events WHERE cleanup_after <= ?")
      .run(this.now().toISOString());
    return Number(result.changes);
  }

  getEventIdForToken(token: string): string {
    return this.getEventByToken(token).id;
  }

  private getEventByToken(token: string): EventRow {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          title,
          currency,
          created_at AS createdAt,
          expires_at AS expiresAt,
          cleanup_after AS cleanupAfter,
          version
        FROM events
        WHERE token_hash = ?
      `,
      )
      .get(hashToken(token));

    if (!row) {
      throw notFound("Event not found.");
    }

    return parseEventRow(row);
  }

  private assertNotExpired(event: EventRow): void {
    if (Date.parse(event.expiresAt) <= this.now().getTime()) {
      throw expired("This event link has expired.");
    }
  }

  private loadSnapshot(event: EventRow, token: string): EventSnapshot {
    const participants = this.loadParticipants(event.id);
    const expenses = this.loadExpenses(event.id);
    const payments = this.loadPayments(event.id);
    const balances = calculateBalances(participants, expenses, payments);

    return {
      event: {
        id: event.id,
        title: event.title,
        currency: event.currency,
        createdAt: event.createdAt,
        expiresAt: event.expiresAt,
        cleanupAfter: event.cleanupAfter,
        version: event.version,
        token,
      },
      participants,
      expenses,
      payments,
      balances,
      settlementSuggestion: getSettlementSuggestion(balances),
    };
  }

  private loadParticipants(eventId: string): Participant[] {
    return this.db
      .prepare(
        `
        SELECT id, name, initials, color, sort_order AS sortOrder
        FROM participants
        WHERE event_id = ?
        ORDER BY sort_order ASC
      `,
      )
      .all(eventId)
      .map(parseParticipantRow);
  }

  private loadExpenses(eventId: string): Expense[] {
    const expenseRows = this.db
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

    const shareRows = this.db
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

  private loadPayments(eventId: string): SettlementPayment[] {
    return this.db
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

  private getNextParticipantSortOrder(eventId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM participants WHERE event_id = ?")
      .get(eventId);
    return readIntegerField(row, "nextSortOrder");
  }

  private requireParticipant(eventId: string, participantId: string): void {
    const row = this.db
      .prepare("SELECT id FROM participants WHERE id = ? AND event_id = ?")
      .get(participantId, eventId);

    if (!row) {
      throw badRequest("Participant does not belong to this event.");
    }
  }

  private requireExpense(eventId: string, expenseId: string): void {
    const row = this.db
      .prepare("SELECT id FROM expenses WHERE id = ? AND event_id = ?")
      .get(expenseId, eventId);

    if (!row) {
      throw notFound("Expense not found.");
    }
  }

  private requirePayment(eventId: string, paymentId: string): void {
    const row = this.db
      .prepare("SELECT id FROM settlement_payments WHERE id = ? AND event_id = ?")
      .get(paymentId, eventId);

    if (!row) {
      throw notFound("Settlement payment not found.");
    }
  }

  private validateExpenseParticipants(eventId: string, command: ExpenseCommand): void {
    this.requireParticipant(eventId, command.payerId);

    if (command.includedParticipantIds.length === 0) {
      throw badRequest("At least one participant must be included.");
    }

    for (const participantId of command.includedParticipantIds) {
      this.requireParticipant(eventId, participantId);
    }
  }

  private validatePaymentParticipants(eventId: string, command: PaymentCommand): void {
    if (command.from === command.to) {
      throw badRequest("Settlement payment participants must be different.");
    }

    this.requireParticipant(eventId, command.from);
    this.requireParticipant(eventId, command.to);
  }

  private isParticipantReferenced(participantId: string): boolean {
    const expenseRefs = readIntegerField(
      this.db
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM expenses
          WHERE payer_participant_id = ?
        `,
        )
        .get(participantId),
      "count",
    );
    const shareRefs = readIntegerField(
      this.db
        .prepare("SELECT COUNT(*) AS count FROM expense_shares WHERE participant_id = ?")
        .get(participantId),
      "count",
    );
    const paymentRefs = readIntegerField(
      this.db
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM settlement_payments
          WHERE from_participant_id = ? OR to_participant_id = ?
        `,
        )
        .get(participantId, participantId),
      "count",
    );

    return expenseRefs + shareRefs + paymentRefs > 0;
  }

  private insertShares(expenseId: string, shares: ExpenseShare[]): void {
    const insertShare = this.db.prepare(
      `
      INSERT INTO expense_shares (expense_id, participant_id, amount_minor)
      VALUES (?, ?, ?)
    `,
    );

    for (const share of shares) {
      insertShare.run(expenseId, share.participantId, share.amountMinor);
    }
  }

  private bumpVersion(eventId: string): void {
    this.db.prepare("UPDATE events SET version = version + 1 WHERE id = ?").run(eventId);
  }
}

function generateToken(): string {
  const bytes = randomBytes(tokenLength);
  let token = "";

  for (const byte of bytes) {
    token += tokenAlphabet.charAt(byte % tokenAlphabet.length);
  }

  return token;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
  return initials || "P";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(row: unknown, key: string): string {
  if (!isRecord(row) || typeof row[key] !== "string") {
    throw new Error(`Database row is missing string field ${key}.`);
  }

  return row[key];
}

function readIntegerField(row: unknown, key: string): number {
  if (!isRecord(row) || typeof row[key] !== "number" || !Number.isSafeInteger(row[key])) {
    throw new Error(`Database row is missing integer field ${key}.`);
  }

  return row[key];
}

function parseEventRow(row: unknown): EventRow {
  const currency = readStringField(row, "currency");
  if (!["AUD", "USD", "EUR", "GBP", "NZD"].includes(currency)) {
    throw new Error(`Database row has unsupported currency ${currency}.`);
  }

  return {
    id: readStringField(row, "id"),
    title: readStringField(row, "title"),
    currency: currency as CurrencyCode,
    createdAt: readStringField(row, "createdAt"),
    expiresAt: readStringField(row, "expiresAt"),
    cleanupAfter: readStringField(row, "cleanupAfter"),
    version: readIntegerField(row, "version"),
  };
}

function parseParticipantRow(row: unknown): ParticipantRow {
  const color = readStringField(row, "color");
  if (!participantColors.includes(color as Participant["color"])) {
    throw new Error(`Database row has unsupported participant color ${color}.`);
  }

  return {
    id: readStringField(row, "id"),
    name: readStringField(row, "name"),
    initials: readStringField(row, "initials"),
    color: color as Participant["color"],
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

function parsePaymentRow(row: unknown): PaymentRow {
  return {
    id: readStringField(row, "id"),
    from: readStringField(row, "from"),
    to: readStringField(row, "to"),
    amountMinor: readIntegerField(row, "amountMinor"),
    createdAt: readStringField(row, "createdAt"),
    updatedAt: readStringField(row, "updatedAt"),
  };
}
