import { readdir, readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import { D1Store } from '../src/store'

export interface MigratedD1Store {
  store: D1Store
  db: D1Database
  miniflare: Miniflare
  migrationFiles: string[]
}

export async function createMigratedD1Store(): Promise<MigratedD1Store> {
  const miniflare = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: {
      DB: `settleup-test-${crypto.randomUUID()}`
    }
  })
  const db = await miniflare.getD1Database('DB')
  const migrationFiles = await applyCheckedInMigrations(db)
  return {
    store: new D1Store(db),
    db,
    miniflare,
    migrationFiles
  }
}

async function applyCheckedInMigrations(db: D1Database): Promise<string[]> {
  const migrationsUrl = new URL('../migrations/', import.meta.url)
  const migrationFiles = (await readdir(migrationsUrl)).filter((file) => file.endsWith('.sql')).sort()

  for (const file of migrationFiles) {
    const migration = await readFile(new URL(file, migrationsUrl), 'utf8')
    for (const statement of statementsFromMigration(migration)) {
      await db.prepare(statement).run()
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
