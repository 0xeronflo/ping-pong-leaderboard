import express from 'express';
import db from '../db/database.js';
import { INITIAL_RATING } from '../services/elo.js';

const router = express.Router();

// GET /api/players - Get all players sorted by ELO
router.get('/', (req, res) => {
  try {
    const players = db.prepare(`
      SELECT
        id,
        name,
        current_elo,
        games_played,
        wins,
        losses,
        CASE
          WHEN games_played > 0 THEN ROUND((wins * 100.0 / games_played), 1)
          ELSE 0
        END as win_rate,
        created_at
      FROM players
      ORDER BY current_elo DESC
    `).all();

    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// POST /api/players - Create a new player
router.post('/', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const result = db.prepare(`
      INSERT INTO players (name, current_elo)
      VALUES (?, ?)
    `).run(name.trim(), INITIAL_RATING);

    const newPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newPlayer);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Player with this name already exists' });
    }
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// GET /api/players/:id - Get specific player
router.get('/:id', (req, res) => {
  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// GET /api/players/:id/stats - Get detailed player statistics
router.get('/:id/stats', (req, res) => {
  try {
    const playerId = req.params.id;

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get biggest ELO gain and loss
    const eloExtremes = db.prepare(`
      SELECT
        MAX(CASE
          WHEN winner_id = ? THEN elo_change
          ELSE -elo_change
        END) as biggest_gain,
        MIN(CASE
          WHEN winner_id = ? THEN elo_change
          ELSE -elo_change
        END) as biggest_loss
      FROM games
      WHERE player1_id = ? OR player2_id = ?
    `).get(playerId, playerId, playerId, playerId);

    // Get current streak
    const recentGames = db.prepare(`
      SELECT winner_id
      FROM games
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY played_at DESC
      LIMIT 20
    `).all(playerId, playerId);

    let currentStreak = 0;
    let streakType = null;

    if (recentGames.length > 0) {
      const firstGameWon = recentGames[0].winner_id === parseInt(playerId);
      streakType = firstGameWon ? 'win' : 'loss';

      for (const game of recentGames) {
        const won = game.winner_id === parseInt(playerId);
        if ((streakType === 'win' && won) || (streakType === 'loss' && !won)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Get head-to-head records
    const headToHead = db.prepare(`
      SELECT
        CASE
          WHEN player1_id = ? THEN player2_id
          ELSE player1_id
        END as opponent_id,
        p.name as opponent_name,
        COUNT(*) as total_games,
        SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_id != ? THEN 1 ELSE 0 END) as losses
      FROM games g
      JOIN players p ON p.id = CASE
        WHEN player1_id = ? THEN player2_id
        ELSE player1_id
      END
      WHERE player1_id = ? OR player2_id = ?
      GROUP BY opponent_id, opponent_name
      ORDER BY total_games DESC
    `).all(playerId, playerId, playerId, playerId, playerId, playerId);

    res.json({
      player,
      biggest_gain: eloExtremes.biggest_gain || 0,
      biggest_loss: eloExtremes.biggest_loss || 0,
      current_streak: currentStreak,
      streak_type: streakType,
      head_to_head: headToHead
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player statistics' });
  }
});

// GET /api/players/:id/elo-history - Get ELO progression over time
router.get('/:id/elo-history', (req, res) => {
  try {
    const playerId = req.params.id;

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const history = db.prepare(`
      SELECT
        id,
        played_at,
        CASE
          WHEN player1_id = ? THEN player1_elo_after
          ELSE player2_elo_after
        END as elo_rating,
        CASE
          WHEN winner_id = ? THEN 'win'
          ELSE 'loss'
        END as result
      FROM games
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY played_at ASC
    `).all(playerId, playerId, playerId, playerId);

    // Include initial rating as starting point
    const eloHistory = [
      {
        id: 0,
        played_at: player.created_at,
        elo_rating: INITIAL_RATING,
        result: 'start'
      },
      ...history
    ];

    res.json(eloHistory);
  } catch (error) {
    console.error('Error fetching ELO history:', error);
    res.status(500).json({ error: 'Failed to fetch ELO history' });
  }
});

export default router;
