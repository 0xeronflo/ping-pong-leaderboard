import express from 'express'
import db from '../db/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/challenges — Send a challenge to another player
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const { opponent_id } = req.body

    if (!opponent_id) {
      return res.status(400).json({ error: 'Opponent is required' })
    }

    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.status(403).json({ error: 'You must have a player profile to send challenges' })
    }

    if (userPlayer.id === parseInt(opponent_id)) {
      return res.status(400).json({ error: 'You cannot challenge yourself' })
    }

    const opponent = db.prepare('SELECT id, name FROM players WHERE id = ?').get(opponent_id)
    if (!opponent) {
      return res.status(404).json({ error: 'Opponent not found' })
    }

    // Block duplicate pending challenges to the same opponent
    const existing = db.prepare(`
      SELECT id FROM challenges
      WHERE challenger_id = ? AND opponent_id = ?
        AND status = 'pending' AND expires_at > datetime('now')
    `).get(userPlayer.id, opponent_id)

    if (existing) {
      return res.status(409).json({ error: 'You already have a pending challenge to this player' })
    }

    const result = db.prepare(`
      INSERT INTO challenges (challenger_id, opponent_id, status, expires_at)
      VALUES (?, ?, 'pending', datetime('now', '+1 hour'))
    `).run(userPlayer.id, opponent_id)

    const challenge = db.prepare(`
      SELECT c.*, p1.name as challenger_name, p2.name as opponent_name
      FROM challenges c
      JOIN players p1 ON c.challenger_id = p1.id
      JOIN players p2 ON c.opponent_id = p2.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid)

    res.status(201).json(challenge)
  } catch (error) {
    console.error('Error creating challenge:', error)
    res.status(500).json({ error: 'Failed to create challenge' })
  }
})

/**
 * GET /api/challenges — Get my pending challenges (sent and received)
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.json({ sent: [], received: [] })
    }

    const challenges = db.prepare(`
      SELECT c.*, p1.name as challenger_name, p2.name as opponent_name
      FROM challenges c
      JOIN players p1 ON c.challenger_id = p1.id
      JOIN players p2 ON c.opponent_id = p2.id
      WHERE (c.challenger_id = ? OR c.opponent_id = ?)
        AND c.status = 'pending'
        AND c.expires_at > datetime('now')
      ORDER BY c.created_at DESC
    `).all(userPlayer.id, userPlayer.id)

    const sent = challenges.filter(c => c.challenger_id === userPlayer.id)
    const received = challenges.filter(c => c.opponent_id === userPlayer.id)

    res.json({ sent, received })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    res.status(500).json({ error: 'Failed to fetch challenges' })
  }
})

/**
 * PATCH /api/challenges/:id — Accept or decline a challenge
 */
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { action } = req.body

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "decline"' })
    }

    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.status(403).json({ error: 'You must have a player profile' })
    }

    const challenge = db.prepare(`
      SELECT * FROM challenges WHERE id = ?
    `).get(req.params.id)

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' })
    }

    if (challenge.opponent_id !== userPlayer.id) {
      return res.status(403).json({ error: 'Only the challenged player can respond' })
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Challenge is no longer pending' })
    }

    if (new Date(challenge.expires_at + 'Z') <= new Date()) {
      return res.status(400).json({ error: 'Challenge has expired' })
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined'

    db.prepare(`
      UPDATE challenges SET status = ?, responded_at = datetime('now') WHERE id = ?
    `).run(newStatus, challenge.id)

    const updated = db.prepare(`
      SELECT c.*, p1.name as challenger_name, p2.name as opponent_name
      FROM challenges c
      JOIN players p1 ON c.challenger_id = p1.id
      JOIN players p2 ON c.opponent_id = p2.id
      WHERE c.id = ?
    `).get(challenge.id)

    res.json(updated)
  } catch (error) {
    console.error('Error responding to challenge:', error)
    res.status(500).json({ error: 'Failed to respond to challenge' })
  }
})

export default router
