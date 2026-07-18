const fs = require('node:fs')
const path = require('node:path')
const { fileURLToPath } = require('node:url')
const { DatabaseSync } = require('node:sqlite')

const databaseUrl = process.env.DATABASE_URL
const migrationsDir = process.env.LAWDESK_DESKTOP_MIGRATIONS_DIR

if (!databaseUrl || !databaseUrl.startsWith('file:')) {
  throw new Error('desktop_database_url_invalid')
}

if (!migrationsDir || !fs.existsSync(migrationsDir)) {
  throw new Error('desktop_database_migrations_missing')
}

const databasePath = fileURLToPath(databaseUrl)
fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const database = new DatabaseSync(databasePath)

try {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS "_lawdesk_desktop_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const applied = database.prepare(
    'SELECT 1 FROM "_lawdesk_desktop_migrations" WHERE "name" = ?',
  )
  const record = database.prepare(
    'INSERT INTO "_lawdesk_desktop_migrations" ("name") VALUES (?)',
  )

  for (const name of fs.readdirSync(migrationsDir).sort()) {
    const migrationPath = path.join(migrationsDir, name, 'migration.sql')
    if (!fs.existsSync(migrationPath) || applied.get(name)) continue

    const sql = fs.readFileSync(migrationPath, 'utf8')
    database.exec('BEGIN IMMEDIATE')
    try {
      database.exec(sql)
      record.run(name)
      database.exec('COMMIT')
      console.log(`[LawDesk] Applied desktop database migration: ${name}`)
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }

  const matterTable = database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'matters'",
  ).get()
  if (!matterTable) throw new Error('desktop_database_schema_incomplete')

  console.log(`[LawDesk] Desktop database ready: ${databasePath}`)
} finally {
  database.close()
}
