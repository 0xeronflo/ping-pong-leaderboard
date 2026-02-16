import express from 'express';
import db from '../db/database.js';
import { calculateEloChange } from '../services/elo.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/games - Get all games
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const games = db.prepare(`
      SELECT
        g.id,
        g.player1_id,
        g.player2_id,
        g.player1_score,
        g.player2_score,
        g.winner_id,
        g.player1_elo_before,
        g.player2_elo_before,
        g.player1_elo_after,
        g.player2_elo_after,
        g.elo_change,
        g.played_at,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM games g
      JOIN players p1 ON g.player1_id = p1.id
      JOIN players p2 ON g.player2_id = p2.id
      JOIN players w ON g.winner_id = w.id
      ORDER BY g.played_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM games').get();

    res.json({
      games,
      total: total.count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// GET /api/games/:id - Get specific game
router.get('/:id', (req, res) => {
  try {
    const game = db.prepare(`
      SELECT
        g.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM games g
      JOIN players p1 ON g.player1_id = p1.id
      JOIN players p2 ON g.player2_id = p2.id
      JOIN players w ON g.winner_id = w.id
      WHERE g.id = ?
    `).get(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/games - Record a new game (requires authentication)
router.post('/', requireAuth, (req, res) => {
  try {
    const { player1_id, player2_id, player1_score, player2_score } = req.body;

    // Validation
    if (!player1_id || !player2_id || player1_score === undefined || player2_score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (player1_id === player2_id) {
      return res.status(400).json({ error: 'Players must be different' });
    }

    // Get the authenticated user's player
    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id);

    if (!userPlayer) {
      return res.status(403).json({ error: 'You must have a player profile to record games' });
    }

    // Ensure the authenticated user is one of the two players
    if (userPlayer.id !== player1_id && userPlayer.id !== player2_id) {
      return res.status(403).json({ error: 'You can only record games that you participated in' });
    }

    if (player1_score === player2_score) {
      return res.status(400).json({ error: 'Game cannot be a tie' });
    }

    if (player1_score < 0 || player2_score < 0) {
      return res.status(400).json({ error: 'Scores must be positive' });
    }

    // Get current player ELOs
    const player1 = db.prepare('SELECT * FROM players WHERE id = ?').get(player1_id);
    const player2 = db.prepare('SELECT * FROM players WHERE id = ?').get(player2_id);

    if (!player1 || !player2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }

    // Determine winner
    const winner_id = player1_score > player2_score ? player1_id : player2_id;
    const winner_elo = player1_score > player2_score ? player1.current_elo : player2.current_elo;
    const loser_elo = player1_score > player2_score ? player2.current_elo : player1.current_elo;

    // Calculate new ELOs
    const { winner_new_elo, loser_new_elo, elo_change } = calculateEloChange(winner_elo, loser_elo);

    const player1_elo_after = player1_score > player2_score ? winner_new_elo : loser_new_elo;
    const player2_elo_after = player1_score > player2_score ? loser_new_elo : winner_new_elo;

    // Start a transaction
    const insertGame = db.transaction(() => {
      // Insert game record
      const gameResult = db.prepare(`
        INSERT INTO games (
          player1_id, player2_id,
          player1_score, player2_score,
          winner_id,
          player1_elo_before, player2_elo_before,
          player1_elo_after, player2_elo_after,
          elo_change
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        player1_id, player2_id,
        player1_score, player2_score,
        winner_id,
        player1.current_elo, player2.current_elo,
        player1_elo_after, player2_elo_after,
        elo_change
      );

      // Update player1
      db.prepare(`
        UPDATE players
        SET current_elo = ?,
            games_played = games_played + 1,
            wins = wins + ?,
            losses = losses + ?
        WHERE id = ?
      `).run(
        player1_elo_after,
        player1_score > player2_score ? 1 : 0,
        player1_score < player2_score ? 1 : 0,
        player1_id
      );

      // Update player2
      db.prepare(`
        UPDATE players
        SET current_elo = ?,
            games_played = games_played + 1,
            wins = wins + ?,
            losses = losses + ?
        WHERE id = ?
      `).run(
        player2_elo_after,
        player2_score > player1_score ? 1 : 0,
        player2_score < player1_score ? 1 : 0,
        player2_id
      );

      return gameResult.lastInsertRowid;
    });

    const gameId = insertGame();

    // Fetch the created game with player names
    const newGame = db.prepare(`
      SELECT
        g.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM games g
      JOIN players p1 ON g.player1_id = p1.id
      JOIN players p2 ON g.player2_id = p2.id
      JOIN players w ON g.winner_id = w.id
      WHERE g.id = ?
    `).get(gameId);

    res.status(201).json(newGame);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

export default router;
