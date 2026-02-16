import db from '../database.js'

/**
 * Migration: Add users table and user_id to players table
 */
export function migrate() {

  console.log('Running migration: 001_add_users')

  // Temporarily disable foreign keys
  db.pragma('foreign_keys = OFF')

  const migration = db.transaction(() => {
    // 1. Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `)

    console.log('✓ Created users table')

    // 2. Check if players table needs migration
    const tableInfo = db.prepare("PRAGMA table_info(players)").all()
    const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id')

    if (!hasUserIdColumn) {
      // 3. Rename existing players table
      db.exec('ALTER TABLE players RENAME TO players_old;')

      console.log('✓ Renamed players to players_old')

      // 4. Create new players table with user_id column
      db.exec(`
        CREATE TABLE players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          user_id INTEGER UNIQUE REFERENCES users(id),
          current_elo REAL DEFAULT 1500,
          games_played INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
      `)

      console.log('✓ Created new players table with user_id column')

      // 5. Copy data from old players table
      db.exec(`
        INSERT INTO players (id, name, current_elo, games_played, wins, losses, created_at)
        SELECT id, name, current_elo, games_played, wins, losses, created_at
        FROM players_old;
      `)

      console.log('✓ Copied data from players_old')

      // 6. Drop old players table
      db.exec('DROP TABLE players_old;')

      console.log('✓ Dropped players_old table')
    } else {
      console.log('✓ Players table already has user_id column, skipping migration')
    }
  })

  migration()

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON')

  console.log('Migration 001_add_users completed successfully')
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrate()
    console.log('✅ Migration completed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}
