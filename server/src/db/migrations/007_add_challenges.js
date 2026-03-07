import db from '../database.js'

/**
 * Migration: Create challenges table for player-to-player match challenges
 */
export function migrate() {
  console.log('Running migration: Add challenges table...')

  db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id INTEGER NOT NULL REFERENCES players(id),
      opponent_id INTEGER NOT NULL REFERENCES players(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      responded_at DATETIME,
      CHECK (challenger_id != opponent_id),
      CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
    );
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_challenges_opponent_status ON challenges(opponent_id, status);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_challenges_challenger_status ON challenges(challenger_id, status);`)

  console.log('Migration completed: Challenges table created')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Done!')
  process.exit(0)
}
