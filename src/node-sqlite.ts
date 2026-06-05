import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite'
import type {
  SqlDatabaseLike,
  SqlMigrationDatabaseLike,
  SqlPreparedStatementLike
} from './sqlite-event-record-persistence'
import { SqliteStore } from './store'

export class NodeSqliteDatabase implements SqlDatabaseLike, SqlMigrationDatabaseLike {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec('pragma foreign_keys = on')
  }

  prepare(query: string): SqlPreparedStatementLike {
    return new NodeSqlitePreparedStatement(this.db.prepare(query))
  }

  async batch(statements: SqlPreparedStatementLike[]): Promise<unknown[]> {
    this.db.exec('begin immediate')
    try {
      const results: unknown[] = []
      for (const statement of statements) {
        results.push(await statement.run())
      }
      this.db.exec('commit')
      return results
    } catch (error: unknown) {
      this.db.exec('rollback')
      throw error
    }
  }

  exec(query: string): void {
    this.db.exec(query)
  }

  close(): void {
    this.db.close()
  }
}

export class NodeSqlitePreparedStatement implements SqlPreparedStatementLike {
  constructor(
    private readonly statement: StatementSync,
    private readonly values: unknown[] = []
  ) {}

  bind(...values: unknown[]): SqlPreparedStatementLike {
    return new NodeSqlitePreparedStatement(this.statement, values)
  }

  async first<T = unknown>(): Promise<T | null> {
    return (this.statement.get(...sqlInputValues(this.values)) as T | undefined) ?? null
  }

  async all<T = unknown>(): Promise<{ results?: T[] }> {
    return { results: this.statement.all(...sqlInputValues(this.values)) as T[] }
  }

  async run(): Promise<unknown> {
    return this.statement.run(...sqlInputValues(this.values))
  }
}

export interface SqliteRuntime {
  store: SqliteStore
  db: NodeSqliteDatabase
  migrationFiles: string[]
}

export function createSqliteRuntime(databasePath: string, migrationsUrl = new URL('../migrations/', import.meta.url)): SqliteRuntime {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }
  const db = new NodeSqliteDatabase(new DatabaseSync(databasePath))
  const migrationFiles = applyCheckedInMigrations(db, migrationsUrl)
  return {
    store: new SqliteStore(db),
    db,
    migrationFiles
  }
}

export function applyCheckedInMigrations(db: SqlMigrationDatabaseLike, migrationsUrl: URL): string[] {
  const migrationFiles = readdirSync(migrationsUrl).filter((file) => file.endsWith('.sql')).sort()
  for (const file of migrationFiles) {
    const migration = readFileSync(new URL(file, migrationsUrl), 'utf8')
    for (const statement of statementsFromMigration(migration)) {
      db.exec(statement)
    }
  }
  return migrationFiles
}

function statementsFromMigration(migration: string): string[] {
  return migration
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

function sqlInputValues(values: unknown[]): SQLInputValue[] {
  return values.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint'
    ) {
      return value
    }
    throw new TypeError(`Unsupported SQLite bind value: ${String(value)}`)
  })
}
