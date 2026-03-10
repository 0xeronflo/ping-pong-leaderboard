import db from '../database.js'

/**
 * Migration: Create reservations table for table scheduling
 */
export function migrate() {
  console.log('Running migration: Add reservations table...')

  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL REFERENCES players(id),
      opponent_id INTEGER NOT NULL REFERENCES players(id),
      scheduled_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      CHECK (creator_id != opponent_id),
      CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled'))
    );
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_reservations_opponent_status ON reservations(opponent_id, status);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reservations_creator_status ON reservations(creator_id, status);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reservations_scheduled_time ON reservations(scheduled_time);`)

  console.log('Migration completed: Reservations table created')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Done!')
  process.exit(0)
}
