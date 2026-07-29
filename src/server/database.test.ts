import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { migrate, openDatabase, type SqliteDatabase } from "./database.js";

describe("database migrations", () => {
  it("creates the presentation-neutral participant schema at version one", () => {
    const db = openDatabase(":memory:");

    try {
      expect(tableColumnNames(db, "participants")).toEqual([
        "id",
        "event_id",
        "name",
        "sort_order",
        "created_at",
        "updated_at",
      ]);
      expect(db.pragma("user_version", { simple: true })).toBe(1);
    } finally {
      db.close();
    }
  });

  it("idempotently migrates legacy participant data without breaking foreign keys", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createLegacyDatabase(db);

    try {
      migrate(db);
      migrate(db);

      expect(tableColumnNames(db, "participants")).toEqual([
        "id",
        "event_id",
        "name",
        "sort_order",
        "created_at",
        "updated_at",
      ]);
      expect(
        db.prepare(
          `
          SELECT id, event_id AS eventId, name, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
          FROM participants
          ORDER BY sort_order
        `,
        ).all(),
      ).toEqual([
        {
          id: "participant-1",
          eventId: "event-1",
          name: "Andrejs",
          sortOrder: 0,
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "participant-2",
          eventId: "event-1",
          name: "Mia",
          sortOrder: 1,
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ]);
      expect(
        db.prepare(
          `
          SELECT
            expenses.amount_minor AS expenseAmountMinor,
            expense_shares.amount_minor AS shareAmountMinor,
            settlement_payments.amount_minor AS paymentAmountMinor
          FROM expenses
          JOIN expense_shares ON expense_shares.expense_id = expenses.id
          JOIN settlement_payments ON settlement_payments.event_id = expenses.event_id
          WHERE expense_shares.participant_id = ?
        `,
        ).get("participant-2"),
      ).toEqual({
        expenseAmountMinor: 1001,
        shareAmountMinor: 500,
        paymentAmountMinor: 500,
      });
      expect(db.pragma("foreign_key_check")).toEqual([]);
      expect(db.pragma("user_version", { simple: true })).toBe(1);
    } finally {
      db.close();
    }
  });

  it("rolls back every schema change when a legacy migration cannot complete", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createLegacyDatabase(db);
    db.exec("CREATE INDEX legacy_participants_color_idx ON participants(color)");

    try {
      expect(() => migrate(db)).toThrow();
      expect(tableColumnNames(db, "participants")).toContain("initials");
      expect(tableColumnNames(db, "participants")).toContain("color");
      expect(
        db.prepare(
          `
          SELECT name
          FROM sqlite_master
          WHERE type = 'index'
            AND name IN ('expenses_event_created_idx', 'settlement_payments_event_created_idx')
        `,
        ).all(),
      ).toEqual([]);
      expect(db.pragma("user_version", { simple: true })).toBe(0);
      expect(db.pragma("foreign_key_check")).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("rejects newer database versions without changing their schema or data", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createLegacyDatabase(db);
    db.pragma("user_version = 2");

    try {
      expect(() => migrate(db)).toThrow(
        "Database schema version 2 is newer than supported version 1.",
      );
      expect(tableColumnNames(db, "participants")).toContain("initials");
      expect(tableColumnNames(db, "participants")).toContain("color");
      expect(db.prepare("SELECT COUNT(*) AS count FROM participants").get()).toEqual({ count: 2 });
      expect(db.pragma("user_version", { simple: true })).toBe(2);
      expect(db.pragma("foreign_key_check")).toEqual([]);
    } finally {
      db.close();
    }
  });
});

function tableColumnNames(db: SqliteDatabase, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as { name: string }[]).map((column) => column.name);
}

function createLegacyDatabase(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      cleanup_after TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX participants_event_sort_idx
      ON participants(event_id, sort_order);

    CREATE TABLE expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      payer_participant_id TEXT NOT NULL REFERENCES participants(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE expense_shares (
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES participants(id),
      amount_minor INTEGER NOT NULL,
      PRIMARY KEY (expense_id, participant_id)
    );

    CREATE TABLE settlement_payments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      from_participant_id TEXT NOT NULL REFERENCES participants(id),
      to_participant_id TEXT NOT NULL REFERENCES participants(id),
      amount_minor INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT INTO events
      (id, token_hash, title, currency, created_at, expires_at, cleanup_after, version)
    VALUES
      (
        'event-1',
        'token-hash-1',
        'Dinner',
        'AUD',
        '2026-07-01T00:00:00.000Z',
        '2026-07-04T00:00:00.000Z',
        '2026-07-06T00:00:00.000Z',
        4
      );

    INSERT INTO participants
      (id, event_id, name, initials, color, sort_order, created_at, updated_at)
    VALUES
      (
        'participant-1',
        'event-1',
        'Andrejs',
        'A',
        'green',
        0,
        '2026-07-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z'
      ),
      (
        'participant-2',
        'event-1',
        'Mia',
        'M',
        'blue',
        1,
        '2026-07-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z'
      );

    INSERT INTO expenses
      (id, event_id, description, amount_minor, payer_participant_id, created_at, updated_at)
    VALUES
      (
        'expense-1',
        'event-1',
        'Pizza',
        1001,
        'participant-1',
        '2026-07-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z'
      );

    INSERT INTO expense_shares (expense_id, participant_id, amount_minor)
    VALUES
      ('expense-1', 'participant-1', 501),
      ('expense-1', 'participant-2', 500);

    INSERT INTO settlement_payments
      (id, event_id, from_participant_id, to_participant_id, amount_minor, created_at, updated_at)
    VALUES
      (
        'payment-1',
        'event-1',
        'participant-2',
        'participant-1',
        500,
        '2026-07-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z'
      );
  `);
}
