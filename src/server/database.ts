import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type SqliteDatabase = Database.Database;

const schemaVersion = 2;

export function openDatabase(path: string): SqliteDatabase {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

export function migrate(db: SqliteDatabase): void {
  db.transaction(() => {
    const currentVersion = db.pragma("user_version", { simple: true });

    if (
      typeof currentVersion !== "number"
      || !Number.isSafeInteger(currentVersion)
      || currentVersion < 0
    ) {
      throw new Error("Database schema version is invalid.");
    }

    if (currentVersion > schemaVersion) {
      throw new Error(
        `Database schema version ${currentVersion} is newer than supported version ${schemaVersion}.`,
      );
    }

    if (currentVersion < 1) {
      migrateToVersionOne(db);
    }
    if (currentVersion < 2) {
      migrateToVersionTwo(db);
      db.pragma(`user_version = ${schemaVersion}`);
    }
  }).immediate();
}

function migrateToVersionOne(db: SqliteDatabase): void {
  db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        currency TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        cleanup_after TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS participants_event_sort_idx
        ON participants(event_id, sort_order);

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        payer_participant_id TEXT NOT NULL REFERENCES participants(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS expenses_event_created_idx
        ON expenses(event_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS expense_shares (
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES participants(id),
        amount_minor INTEGER NOT NULL,
        PRIMARY KEY (expense_id, participant_id)
      );

      CREATE TABLE IF NOT EXISTS settlement_payments (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        from_participant_id TEXT NOT NULL REFERENCES participants(id),
        to_participant_id TEXT NOT NULL REFERENCES participants(id),
        amount_minor INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS settlement_payments_event_created_idx
        ON settlement_payments(event_id, created_at DESC);
  `);

  const participantColumns = new Set(
    db.prepare("PRAGMA table_info(participants)").all().map((column) => readStringField(column, "name")),
  );

  if (participantColumns.has("initials")) {
    db.exec("ALTER TABLE participants DROP COLUMN initials");
  }
  if (participantColumns.has("color")) {
    db.exec("ALTER TABLE participants DROP COLUMN color");
  }
}

function migrateToVersionTwo(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE ordered_expense_shares (
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES participants(id),
      amount_minor INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      PRIMARY KEY (expense_id, participant_id),
      UNIQUE (expense_id, position)
    );

    INSERT INTO ordered_expense_shares (expense_id, participant_id, amount_minor, position)
    SELECT expense_id, participant_id, amount_minor,
      ROW_NUMBER() OVER (
        PARTITION BY expense_id ORDER BY amount_minor DESC, rowid
      ) - 1
    FROM expense_shares;

    DROP TABLE expense_shares;
    ALTER TABLE ordered_expense_shares RENAME TO expense_shares;
  `);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readStringField(row: unknown, key: string): string {
  if (!isRecord(row) || typeof row[key] !== "string") {
    throw new Error(`Database row is missing string field ${key}.`);
  }

  return row[key];
}

export function readIntegerField(row: unknown, key: string): number {
  if (!isRecord(row) || typeof row[key] !== "number" || !Number.isSafeInteger(row[key])) {
    throw new Error(`Database row is missing integer field ${key}.`);
  }

  return row[key];
}
