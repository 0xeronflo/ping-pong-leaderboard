import db from '../database.js';

/**
 * Migration: Add sets column to games table for tracking individual set scores
 */
export function migrate() {
  console.log('Running migration: Add sets to games table...');

  // Add sets column as JSON text
  db.exec(`
    ALTER TABLE games ADD COLUMN sets TEXT;
  `);

  console.log('Migration completed: Sets column added to games table');
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
  console.log('Done!');
  process.exit(0);
}
