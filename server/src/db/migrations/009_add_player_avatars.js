import db from '../database.js'

/**
 * Migration: Add avatar_url column to players table
 */
export function migrate() {
  console.log('Running migration: Add avatar_url to players...')

  db.exec(`ALTER TABLE players ADD COLUMN avatar_url TEXT DEFAULT NULL`)

  console.log('Migration completed: avatar_url column added to players')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Done!')
  process.exit(0)
}
