import { migrate as addUsers } from './migrations/001_add_users.js';
import { migrate as fixGamesForeignKeys } from './migrations/002_fix_games_foreign_keys.js';
import { migrate as addSetsToGames } from './migrations/003_add_sets_to_games.js';
import { migrate as recalculateEloSetsWeighting } from './migrations/004_recalculate_elo_sets_weighting.js';
import { migrate as mergeAsianmartyCobraGames } from './migrations/005_merge_asianmarty_cobra_games.js';
import db from './database.js';

/**
 * Run all database migrations
 */
export function runMigrations() {
  console.log('Running database migrations...');

  // Check if migrations table exists
  const migrationsTableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='migrations'
  `).get();

  if (!migrationsTableExists) {
    // Create migrations tracking table
    db.exec(`
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created migrations table');
  }

  // Define migrations in order
  const migrations = [
    { name: '001_add_users', fn: addUsers },
    { name: '002_fix_games_foreign_keys', fn: fixGamesForeignKeys },
    { name: '003_add_sets_to_games', fn: addSetsToGames },
    { name: '004_recalculate_elo_sets_weighting', fn: recalculateEloSetsWeighting },
    { name: '005_merge_asianmarty_cobra_games', fn: mergeAsianmartyCobraGames }
  ];

  // Run each migration if not already applied
  for (const migration of migrations) {
    const applied = db.prepare('SELECT * FROM migrations WHERE name = ?').get(migration.name);

    if (!applied) {
      console.log(`Running migration: ${migration.name}`);
      try {
        migration.fn();
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
        console.log(`✅ Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error);
        // In production, you might want to exit the process here
        // process.exit(1);
      }
    } else {
      console.log(`⏭️  Migration ${migration.name} already applied`);
    }
  }

  console.log('All migrations completed');
}
