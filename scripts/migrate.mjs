#!/usr/bin/env node
/**
 * Minimal migration-runner för Newsdeck (P3-1).
 *
 * Använder Postgres direkt via `pg` (samma som applikationen). Loggar varje
 * körd migration i `schema_migrations`-tabellen och hoppar över de som redan
 * är applicerade. Inga externa beroenden utöver det som redan finns i
 * package.json.
 *
 * Anropas via:
 *   npm run db:migrate           # applicera alla pending migrations
 *   npm run db:migrate -- --status  # visa vilka som är körda/pending
 *
 * Förutsätter att DATABASE_URL är satt (lokalt via .env.local + proxy).
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'db', 'migrations')

// Lokal .env.local används av utvecklare; deployer (Cloud Run-job, GitHub
// Actions) sätter DATABASE_URL direkt så då hoppas .env-laddningen tomt.
loadDotenv({ path: join(ROOT, '.env.local') })
if (!process.env.DATABASE_URL) {
  loadDotenv({ path: join(ROOT, '.env') })
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL saknas. Kör npm run proxy:start och kontrollera .env.local.')
  process.exit(1)
}

const STATUS_ONLY = process.argv.includes('--status')
const DRY_RUN = process.argv.includes('--dry-run')

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function listApplied() {
  const { rows } = await client.query(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename ASC',
  )
  return new Map(rows.map((r) => [r.filename, r.applied_at]))
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function applyMigration(filename) {
  const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
  // Varje migration körs i en transaktion förutom CREATE INDEX CONCURRENTLY
  // (som inte tillåts i transaktion). Vi gör en enkel heuristik: om innehållet
  // har CONCURRENTLY, hoppar vi över BEGIN/COMMIT-wrappingen.
  const useTransaction = !/CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY/i.test(sql)

  if (useTransaction) await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename],
    )
    if (useTransaction) await client.query('COMMIT')
  } catch (error) {
    if (useTransaction) await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  await client.connect()
  await ensureMigrationsTable()

  const applied = await listApplied()
  const files = listMigrationFiles()

  const pending = files.filter((f) => !applied.has(f))

  if (STATUS_ONLY) {
    console.log('Migration-status:\n')
    for (const f of files) {
      const at = applied.get(f)
      if (at) console.log(`  ✅  ${f}  (applied ${new Date(at).toISOString()})`)
      else console.log(`  ⏳  ${f}  (pending)`)
    }
    console.log(`\nTotalt: ${files.length}, applicerade: ${applied.size}, pending: ${pending.length}`)
    return
  }

  if (pending.length === 0) {
    console.log('✅ Inga pending migrations — databasen är aktuell.')
    return
  }

  console.log(`📦 Hittade ${pending.length} pending migration${pending.length === 1 ? '' : 's'}:\n`)
  for (const f of pending) console.log(`   • ${f}`)
  console.log()

  if (DRY_RUN) {
    console.log('🟡 --dry-run angiven, kör ingen SQL.')
    return
  }

  for (const f of pending) {
    process.stdout.write(`▶ ${f} ... `)
    const t0 = Date.now()
    try {
      await applyMigration(f)
      console.log(`OK (${Date.now() - t0}ms)`)
    } catch (error) {
      console.log('FAIL')
      console.error(error)
      process.exit(1)
    }
  }

  console.log(`\n✅ ${pending.length} migration${pending.length === 1 ? '' : 's'} applicerade.`)
}

main()
  .catch((err) => {
    console.error('❌ migrate.mjs failed:', err)
    process.exit(1)
  })
  .finally(() => client.end().catch(() => {}))
