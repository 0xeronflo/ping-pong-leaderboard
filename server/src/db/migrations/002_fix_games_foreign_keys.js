import db from '../database.js';

/**
 * Migration: Fix games table foreign keys to reference players instead of players_old
 */
export function migrate() {
  console.log('Running migration: Fix games table foreign keys...');

  // Disable foreign key constraints during migration
  db.pragma('foreign_keys = OFF');

  const migration = db.transaction(() => {
    // Rename games to games_old
    db.exec('ALTER TABLE games RENAME TO games_old;');

    // Create new games table with correct foreign keys
    db.exec(`
      CREATE TABLE games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER NOT NULL,
        player2_score INTEGER NOT NULL,
        winner_id INTEGER NOT NULL,
        player1_elo_before REAL NOT NULL,
        player2_elo_before REAL NOT NULL,
        player1_elo_after REAL NOT NULL,
        player2_elo_after REAL NOT NULL,
        elo_change REAL NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES players(id),
        FOREIGN KEY (player2_id) REFERENCES players(id),
        FOREIGN KEY (winner_id) REFERENCES players(id)
      );
    `);

    // Copy all data from games_old to games
    db.exec(`
      INSERT INTO games (
        id, player1_id, player2_id,
        player1_score, player2_score, winner_id,
        player1_elo_before, player2_elo_before,
        player1_elo_after, player2_elo_after,
        elo_change, played_at
      )
      SELECT
        id, player1_id, player2_id,
        player1_score, player2_score, winner_id,
        player1_elo_before, player2_elo_before,
        player1_elo_after, player2_elo_after,
        elo_change, played_at
      FROM games_old;
    `);

    // Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);');

    // Drop old table
    db.exec('DROP TABLE games_old;');
  });

  // Run the migration
  migration();

  // Re-enable foreign key constraints
  db.pragma('foreign_keys = ON');

  console.log('Migration completed: Games table foreign keys fixed');
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
  console.log('Done!');
  process.exit(0);
}
