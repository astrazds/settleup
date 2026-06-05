import { createSqliteRuntime } from '../src/node-sqlite'
import { SqliteStore } from '../src/store'
import type { NodeSqliteDatabase } from '../src/node-sqlite'

export interface MigratedSqliteStore {
  store: SqliteStore
  db: NodeSqliteDatabase
  migrationFiles: string[]
}

export function createMigratedSqliteStore(): MigratedSqliteStore {
  const runtime = createSqliteRuntime(':memory:')
  return {
    store: runtime.store,
    db: runtime.db,
    migrationFiles: runtime.migrationFiles
  }
}
