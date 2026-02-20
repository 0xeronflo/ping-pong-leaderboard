/**
 * One-time script to recalculate all historical ELO values using the
 * set-weighted K-factor system. Replays every game in chronological order.
 *
 * Run from the server/ directory:
 *   node src/scripts/recalculate-elo.js
 */

import db from '../db/database.js';
import { calculateEloChange } from '../services/elo.js';

const INITIAL_RATING = 1500;
const REFERENCE_SETS = 3;

const recalculate = db.transaction(() => {
  // Load all games in the order they were played
  const games = db.prepare(`
    SELECT * FROM games ORDER BY played_at ASC, id ASC
  `).all();

  // Load all players and seed in-memory state
  const players = db.prepare('SELECT id FROM players').all();
  const eloMap = {};   // player_id -> current elo
  const statsMap = {}; // player_id -> { games_played, wins, losses }

  for (const p of players) {
    eloMap[p.id] = INITIAL_RATING;
    statsMap[p.id] = { games_played: 0, wins: 0, losses: 0 };
  }

  const updateGame = db.prepare(`
    UPDATE games
    SET player1_elo_before = ?,
        player2_elo_before = ?,
        player1_elo_after  = ?,
        player2_elo_after  = ?,
        elo_change         = ?
    WHERE id = ?
  `);

  let recalculated = 0;

  for (const game of games) {
    const p1Id = game.player1_id;
    const p2Id = game.player2_id;

    const p1EloBefore = eloMap[p1Id];
    const p2EloBefore = eloMap[p2Id];

    // Determine total sets played; fall back to REFERENCE_SETS for legacy rows
    let totalSets = REFERENCE_SETS;
    if (game.sets) {
      try {
        const parsed = JSON.parse(game.sets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          totalSets = parsed.length;
        }
      } catch (_) { /* malformed sets JSON, keep default */ }
    }

    const winnerId = game.winner_id;
    const winnerEloBefore = eloMap[winnerId];
    const loserId = winnerId === p1Id ? p2Id : p1Id;
    const loserEloBefore = eloMap[loserId];

    const { winner_new_elo, loser_new_elo, elo_change } = calculateEloChange(
      winnerEloBefore,
      loserEloBefore,
      totalSets
    );

    const p1EloAfter = winnerId === p1Id ? winner_new_elo : loser_new_elo;
    const p2EloAfter = winnerId === p2Id ? winner_new_elo : loser_new_elo;

    updateGame.run(p1EloBefore, p2EloBefore, p1EloAfter, p2EloAfter, elo_change, game.id);

    // Advance in-memory state
    eloMap[p1Id] = p1EloAfter;
    eloMap[p2Id] = p2EloAfter;

    statsMap[p1Id].games_played++;
    statsMap[p2Id].games_played++;
    if (winnerId === p1Id) {
      statsMap[p1Id].wins++;
      statsMap[p2Id].losses++;
    } else {
      statsMap[p2Id].wins++;
      statsMap[p1Id].losses++;
    }

    recalculated++;
  }

  // Write final player stats back to DB
  const updatePlayer = db.prepare(`
    UPDATE players
    SET current_elo   = ?,
        games_played  = ?,
        wins          = ?,
        losses        = ?
    WHERE id = ?
  `);

  for (const p of players) {
    updatePlayer.run(
      eloMap[p.id],
      statsMap[p.id].games_played,
      statsMap[p.id].wins,
      statsMap[p.id].losses,
      p.id
    );
  }

  return recalculated;
});

const count = recalculate();
console.log(`✅ Recalculated ELO for ${count} game(s).`);
process.exit(0);
