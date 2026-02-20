import db from '../database.js'
import { calculateEloChange } from '../../services/elo.js'

const INITIAL_RATING = 1500

/**
 * Migration: Recalculate all historical ELO values using the updated formula
 * that factors in both sets played and average point differential per set.
 */
export function migrate() {
  console.log('Running migration: 006_recalculate_elo_point_differential')

  const run = db.transaction(() => {
    const games = db.prepare(
      'SELECT * FROM games ORDER BY played_at ASC, id ASC'
    ).all()

    const players = db.prepare('SELECT id FROM players').all()
    const eloMap = {}
    const statsMap = {}
    for (const p of players) {
      eloMap[p.id] = INITIAL_RATING
      statsMap[p.id] = { games_played: 0, wins: 0, losses: 0 }
    }

    const updateGame = db.prepare(`
      UPDATE games
      SET player1_elo_before = ?,
          player2_elo_before = ?,
          player1_elo_after  = ?,
          player2_elo_after  = ?,
          elo_change         = ?
      WHERE id = ?
    `)

    for (const game of games) {
      const p1Id = game.player1_id
      const p2Id = game.player2_id

      const p1EloBefore = eloMap[p1Id]
      const p2EloBefore = eloMap[p2Id]

      let parsedSets = []
      if (game.sets) {
        try {
          const parsed = JSON.parse(game.sets)
          if (Array.isArray(parsed)) parsedSets = parsed
        } catch (_) {}
      }

      const wId = game.winner_id
      const lId = wId === p1Id ? p2Id : p1Id

      const { winner_new_elo, loser_new_elo, elo_change } = calculateEloChange(
        eloMap[wId], eloMap[lId], parsedSets
      )

      const p1EloAfter = wId === p1Id ? winner_new_elo : loser_new_elo
      const p2EloAfter = wId === p2Id ? winner_new_elo : loser_new_elo

      updateGame.run(p1EloBefore, p2EloBefore, p1EloAfter, p2EloAfter, elo_change, game.id)

      eloMap[p1Id] = p1EloAfter
      eloMap[p2Id] = p2EloAfter

      statsMap[p1Id].games_played++
      statsMap[p2Id].games_played++
      if (wId === p1Id) { statsMap[p1Id].wins++; statsMap[p2Id].losses++ }
      else               { statsMap[p2Id].wins++; statsMap[p1Id].losses++ }
    }

    const updatePlayer = db.prepare(`
      UPDATE players
      SET current_elo  = ?,
          games_played = ?,
          wins         = ?,
          losses       = ?
      WHERE id = ?
    `)

    for (const p of players) {
      updatePlayer.run(
        eloMap[p.id],
        statsMap[p.id].games_played,
        statsMap[p.id].wins,
        statsMap[p.id].losses,
        p.id
      )
    }

    console.log(`✓ Recalculated ELO for ${games.length} game(s) with point differential weighting`)
  })

  run()

  console.log('Migration 006_recalculate_elo_point_differential completed successfully')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrate()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}
