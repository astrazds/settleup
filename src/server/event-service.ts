import { createHash, randomBytes, randomUUID } from "node:crypto";

import type {
  CreateEventCommand,
  CreateEventResponse,
  EventSnapshot,
  ExpenseCommand,
  ExpenseShare,
  ParticipantCommand,
  PaymentCommand,
} from "@settleup/contracts";

import { currencyCodeSchema } from "@settleup/contracts";
import { deriveEqualShares } from "./ledger.js";
import {
  assertStoredAmountSafe,
  loadEventSnapshot,
  maximumExactEventAmountMinor,
  readEventAmountTotal,
  type AmountExclusion,
  type EventRecord,
} from "./event-snapshot.js";
import {
  badRequest,
  expired,
  notFound,
  preconditionFailed,
} from "./errors.js";
import { readIntegerField, readStringField, type SqliteDatabase } from "./database.js";

const tokenAlphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const tokenLength = 14;
const eventLifetimeMs = 3 * 24 * 60 * 60 * 1000;
const cleanupLifetimeMs = 5 * 24 * 60 * 60 * 1000;
type NowProvider = () => Date;

export type EventVersionPrecondition =
  | { kind: "any-current" }
  | { kind: "strong-tags"; versions: readonly number[] };

export class EventService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly now: NowProvider = () => new Date(),
  ) {}

  createEvent(command: CreateEventCommand): CreateEventResponse {
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
          INSERT INTO participants (id, event_id, name, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, 0, ?, ?)
        `,
        )
        .run(
          participantId,
          eventId,
          command.firstParticipantName,
          createdAt,
          createdAt,
        );
    });

    create();
    return { token, snapshot: this.getSnapshotByToken(token) };
  }

  getSnapshotByToken(token: string): EventSnapshot {
    const event = this.requireActiveEvent(token);
    return loadEventSnapshot(this.db, event, token);
  }

  addParticipant(
    token: string,
    command: ParticipantCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    const createdAt = this.now().toISOString();
    const nextSortOrder = this.getNextParticipantSortOrder(event.id);

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.db
        .prepare(
          `
          INSERT INTO participants (id, event_id, name, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          randomUUID(),
          event.id,
          command.name,
          nextSortOrder,
          createdAt,
          createdAt,
        );
    });
  }

  renameParticipant(
    token: string,
    participantId: string,
    command: ParticipantCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requireParticipant(event.id, participantId);
    const updatedAt = this.now().toISOString();

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.db
        .prepare("UPDATE participants SET name = ?, updated_at = ? WHERE id = ? AND event_id = ?")
        .run(command.name, updatedAt, participantId, event.id);
    });
  }

  deleteParticipant(
    token: string,
    participantId: string,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requireParticipant(event.id, participantId);

    if (this.getParticipantCount(event.id) <= 1) {
      throw badRequest("An event needs at least one participant.");
    }

    if (this.isParticipantReferenced(participantId)) {
      throw badRequest("Only unreferenced participants can be deleted.");
    }

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.db.prepare("DELETE FROM participants WHERE id = ? AND event_id = ?").run(participantId, event.id);
    });
  }

  createExpense(
    token: string,
    command: ExpenseCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    const expenseId = randomUUID();
    const now = this.now().toISOString();
    this.validateExpenseParticipants(event.id, command);
    const shares = deriveEqualShares(command.amountMinor, command.includedParticipantIds);

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.assertSafeEventAmountTotal(event.id, command.amountMinor);
      this.db
        .prepare(
          `
          INSERT INTO expenses (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(expenseId, event.id, command.description, command.amountMinor, command.payerId, now, now);

      this.insertShares(expenseId, shares);
    });
  }

  updateExpense(
    token: string,
    expenseId: string,
    command: ExpenseCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requireExpense(event.id, expenseId);
    this.validateExpenseParticipants(event.id, command);
    const shares = deriveEqualShares(command.amountMinor, command.includedParticipantIds);
    const updatedAt = this.now().toISOString();

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.assertSafeEventAmountTotal(
        event.id,
        command.amountMinor,
        { kind: "expense", id: expenseId },
      );
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
    });
  }

  deleteExpense(
    token: string,
    expenseId: string,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requireExpense(event.id, expenseId);

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.db.prepare("DELETE FROM expenses WHERE id = ? AND event_id = ?").run(expenseId, event.id);
    });
  }

  createPayment(
    token: string,
    command: PaymentCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    const paymentId = randomUUID();
    const now = this.now().toISOString();
    this.validatePaymentParticipants(event.id, command);

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.assertSafeEventAmountTotal(event.id, command.amountMinor);
      this.db
        .prepare(
          `
          INSERT INTO settlement_payments
            (id, event_id, from_participant_id, to_participant_id, amount_minor, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(paymentId, event.id, command.from, command.to, command.amountMinor, now, now);
    });
  }

  updatePayment(
    token: string,
    paymentId: string,
    command: PaymentCommand,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requirePayment(event.id, paymentId);
    this.validatePaymentParticipants(event.id, command);
    const updatedAt = this.now().toISOString();

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.assertSafeEventAmountTotal(
        event.id,
        command.amountMinor,
        { kind: "payment", id: paymentId },
      );
      this.db
        .prepare(
          `
          UPDATE settlement_payments
          SET from_participant_id = ?, to_participant_id = ?, amount_minor = ?, updated_at = ?
          WHERE id = ? AND event_id = ?
        `,
        )
        .run(command.from, command.to, command.amountMinor, updatedAt, paymentId, event.id);
    });
  }

  deletePayment(
    token: string,
    paymentId: string,
    versionPrecondition?: EventVersionPrecondition,
  ): EventSnapshot {
    const event = this.requireActiveEvent(token);
    this.requirePayment(event.id, paymentId);

    return this.commitMutation(token, event.id, versionPrecondition, () => {
      this.db.prepare("DELETE FROM settlement_payments WHERE id = ? AND event_id = ?").run(paymentId, event.id);
    });
  }

  cleanupExpiredData(): number {
    const result = this.db
      .prepare("DELETE FROM events WHERE cleanup_after <= ?")
      .run(this.now().toISOString());
    return Number(result.changes);
  }

  private requireActiveEvent(token: string): EventRecord {
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

    const event = parseEventRecord(row);
    if (Date.parse(event.expiresAt) <= this.now().getTime()) {
      throw expired("This event link has expired.");
    }
    return event;
  }

  private commitMutation(
    token: string,
    eventId: string,
    precondition: EventVersionPrecondition | undefined,
    write: () => void,
  ): EventSnapshot {
    this.db.transaction(() => {
      this.assertVersionPrecondition(eventId, precondition);
      assertStoredAmountSafe(readEventAmountTotal(this.db, eventId));
      write();
      this.db.prepare("UPDATE events SET version = version + 1 WHERE id = ?").run(eventId);
    })();
    return this.getSnapshotByToken(token);
  }

  private getNextParticipantSortOrder(eventId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM participants WHERE event_id = ?")
      .get(eventId);
    return readIntegerField(row, "nextSortOrder");
  }

  private getParticipantCount(eventId: string): number {
    return readIntegerField(
      this.db.prepare("SELECT COUNT(*) AS count FROM participants WHERE event_id = ?").get(eventId),
      "count",
    );
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

  private assertVersionPrecondition(
    eventId: string,
    precondition: EventVersionPrecondition | undefined,
  ): void {
    if (precondition !== undefined) {
      const currentVersion = readIntegerField(
        this.db.prepare("SELECT version FROM events WHERE id = ?").get(eventId),
        "version",
      );

      if (
        precondition.kind === "strong-tags" &&
        !precondition.versions.includes(currentVersion)
      ) {
        throw preconditionFailed(
          "This event changed before your update was saved. Load the latest version and try again.",
        );
      }
    }
  }

  private assertSafeEventAmountTotal(
    eventId: string,
    nextAmountMinor: number,
    exclusion?: AmountExclusion,
  ): void {
    const totalMinor =
      BigInt(nextAmountMinor) +
      readEventAmountTotal(
        this.db,
        eventId,
        exclusion,
      );

    if (totalMinor > maximumExactEventAmountMinor) {
      throw badRequest(
        "The combined event amount is too large to calculate exactly.",
      );
    }
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

function parseEventRecord(row: unknown): EventRecord {
  const currency = readStringField(row, "currency");
  const parsedCurrency = currencyCodeSchema.safeParse(currency);
  if (!parsedCurrency.success) {
    throw new Error(`Database row has unsupported currency ${currency}.`);
  }

  return {
    id: readStringField(row, "id"),
    title: readStringField(row, "title"),
    currency: parsedCurrency.data,
    createdAt: readStringField(row, "createdAt"),
    expiresAt: readStringField(row, "expiresAt"),
    cleanupAfter: readStringField(row, "cleanupAfter"),
    version: readIntegerField(row, "version"),
  };
}
