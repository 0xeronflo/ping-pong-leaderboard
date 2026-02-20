import db from '../database.js'
import { calculateEloChange } from '../../services/elo.js'

const INITIAL_RATING = 1500

/**
 * Migration: Merge the first 7 separately-recorded games between AsianMarty
 * and Cobra into a single 7-set game, then recalculate all ELO from scratch.
 */
export function migrate() {
  console.log('Running migration: 005_merge_asianmarty_cobra_games')

  const run = db.transaction(() => {
    // Look up both players by name
    const marty = db.prepare("SELECT id FROM players WHERE name = 'AsianMarty'").get()
    const cobra = db.prepare("SELECT id FROM players WHERE name = 'Cobra'").get()

    if (!marty || !cobra) {
      console.log('⚠️  AsianMarty or Cobra not found — skipping merge')
      return
    }

    const martyId = marty.id
    const cobraId = cobra.id

    // Get the 7 earliest games between these two players (in either direction)
    const originalGames = db.prepare(`
      SELECT * FROM games
      WHERE (player1_id = ? AND player2_id = ?)
         OR (player1_id = ? AND player2_id = ?)
      ORDER BY played_at ASC, id ASC
      LIMIT 7
    `).all(martyId, cobraId, cobraId, martyId)

    if (originalGames.length !== 7) {
      console.log(`⚠️  Expected 7 games, found ${originalGames.length} — skipping merge`)
      return
    }

    // Combine all sets, normalising so player1 = AsianMarty, player2 = Cobra
    const mergedSets = []
    for (const game of originalGames) {
      const rawSets = game.sets ? JSON.parse(game.sets) : []
      for (const s of rawSets) {
        if (game.player1_id === martyId) {
          mergedSets.push({ player1_score: s.player1_score, player2_score: s.player2_score })
        } else {
          // Roles are swapped — flip the scores
          mergedSets.push({ player1_score: s.player2_score, player2_score: s.player1_score })
        }
      }
    }

    if (mergedSets.length === 0) {
      console.log('⚠️  No set data found in the 7 games — skipping merge')
      return
    }

    // Count sets won to determine match winner
    let martySetsWon = 0
    let cobraSetsWon = 0
    for (const s of mergedSets) {
      if (s.player1_score > s.player2_score) martySetsWon++
      else cobraSetsWon++
    }

    const winnerId = martySetsWon > cobraSetsWon ? martyId : cobraId

    // Use ELO values at the time of the first game (before anything was applied)
    const p1EloBefore = originalGames[0].player1_id === martyId
      ? originalGames[0].player1_elo_before
      : originalGames[0].player2_elo_before
    const p2EloBefore = originalGames[0].player1_id === cobraId
      ? originalGames[0].player1_elo_before
      : originalGames[0].player2_elo_before

    const winnerEloBefore = winnerId === martyId ? p1EloBefore : p2EloBefore
    const loserEloBefore  = winnerId === martyId ? p2EloBefore : p1EloBefore

    const { winner_new_elo, loser_new_elo, elo_change } = calculateEloChange(
      winnerEloBefore,
      loserEloBefore,
      mergedSets.length
    )

    const martyEloAfter = winnerId === martyId ? winner_new_elo : loser_new_elo
    const cobraEloAfter = winnerId === cobraId ? winner_new_elo : loser_new_elo

    // Delete the 7 original games
    const idsToDelete = originalGames.map(g => g.id)
    db.prepare(
      `DELETE FROM games WHERE id IN (${idsToDelete.map(() => '?').join(',')})`
    ).run(...idsToDelete)

    // Insert the single merged game at the timestamp of the first original game
    db.prepare(`
      INSERT INTO games (
        player1_id, player2_id,
        player1_score, player2_score,
        winner_id,
        player1_elo_before, player2_elo_before,
        player1_elo_after, player2_elo_after,
        elo_change,
        sets,
        played_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      martyId, cobraId,
      martySetsWon, cobraSetsWon,
      winnerId,
      p1EloBefore, p2EloBefore,
      martyEloAfter, cobraEloAfter,
      elo_change,
      JSON.stringify(mergedSets),
      originalGames[0].played_at
    )

    console.log(`✓ Merged 7 games into 1 game with ${mergedSets.length} sets (AsianMarty ${martySetsWon} – ${cobraSetsWon} Cobra)`)

    // --- Full ELO recalculation from scratch ---
    const allGames = db.prepare(
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

    for (const game of allGames) {
      const p1Id = game.player1_id
      const p2Id = game.player2_id

      const p1EloBefore = eloMap[p1Id]
      const p2EloBefore = eloMap[p2Id]

      let totalSets = 3
      if (game.sets) {
        try {
          const parsed = JSON.parse(game.sets)
          if (Array.isArray(parsed) && parsed.length > 0) totalSets = parsed.length
        } catch (_) {}
      }

      const wId = game.winner_id
      const lId = wId === p1Id ? p2Id : p1Id

      const { winner_new_elo, loser_new_elo, elo_change: ec } = calculateEloChange(
        eloMap[wId], eloMap[lId], totalSets
      )

      const p1EloAfter = wId === p1Id ? winner_new_elo : loser_new_elo
      const p2EloAfter = wId === p2Id ? winner_new_elo : loser_new_elo

      updateGame.run(p1EloBefore, p2EloBefore, p1EloAfter, p2EloAfter, ec, game.id)

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

    console.log(`✓ ELO recalculated for ${allGames.length} game(s)`)
  })

  run()

  console.log('Migration 005_merge_asianmarty_cobra_games completed successfully')
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrate()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}
