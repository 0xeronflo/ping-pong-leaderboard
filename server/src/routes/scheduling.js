import express from 'express'
import db from '../db/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/scheduling — Create a table reservation (invite opponent)
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const { opponent_id, scheduled_time } = req.body

    if (!opponent_id) {
      return res.status(400).json({ error: 'Opponent is required' })
    }
    if (!scheduled_time) {
      return res.status(400).json({ error: 'Scheduled time is required' })
    }

    const scheduledDate = new Date(scheduled_time)
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time' })
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' })
    }

    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.status(403).json({ error: 'You must have a player profile to schedule matches' })
    }

    if (userPlayer.id === parseInt(opponent_id)) {
      return res.status(400).json({ error: 'You cannot schedule a match with yourself' })
    }

    const opponent = db.prepare('SELECT id, name FROM players WHERE id = ?').get(opponent_id)
    if (!opponent) {
      return res.status(404).json({ error: 'Opponent not found' })
    }

    // Block duplicate pending reservations with same opponent at same time
    const existing = db.prepare(`
      SELECT id FROM reservations
      WHERE creator_id = ? AND opponent_id = ? AND scheduled_time = ?
        AND status = 'pending'
    `).get(userPlayer.id, opponent_id, scheduledDate.toISOString())

    if (existing) {
      return res.status(409).json({ error: 'You already have a pending reservation with this player at this time' })
    }

    const result = db.prepare(`
      INSERT INTO reservations (creator_id, opponent_id, scheduled_time, status)
      VALUES (?, ?, ?, 'pending')
    `).run(userPlayer.id, opponent_id, scheduledDate.toISOString())

    const reservation = db.prepare(`
      SELECT r.*, p1.name as creator_name, p2.name as opponent_name
      FROM reservations r
      JOIN players p1 ON r.creator_id = p1.id
      JOIN players p2 ON r.opponent_id = p2.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid)

    res.status(201).json(reservation)
  } catch (error) {
    console.error('Error creating reservation:', error)
    res.status(500).json({ error: 'Failed to create reservation' })
  }
})

/**
 * GET /api/scheduling — Get my reservations (sent and received, pending + confirmed upcoming)
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.json({ sent: [], received: [], confirmed: [] })
    }

    // Pending invitations I sent
    const sent = db.prepare(`
      SELECT r.*, p1.name as creator_name, p2.name as opponent_name
      FROM reservations r
      JOIN players p1 ON r.creator_id = p1.id
      JOIN players p2 ON r.opponent_id = p2.id
      WHERE r.creator_id = ?
        AND r.status = 'pending'
        AND r.scheduled_time > datetime('now')
      ORDER BY r.scheduled_time ASC
    `).all(userPlayer.id)

    // Pending invitations I received
    const received = db.prepare(`
      SELECT r.*, p1.name as creator_name, p2.name as opponent_name
      FROM reservations r
      JOIN players p1 ON r.creator_id = p1.id
      JOIN players p2 ON r.opponent_id = p2.id
      WHERE r.opponent_id = ?
        AND r.status = 'pending'
        AND r.scheduled_time > datetime('now')
      ORDER BY r.scheduled_time ASC
    `).all(userPlayer.id)

    // Confirmed upcoming reservations (where I'm either creator or opponent)
    const confirmed = db.prepare(`
      SELECT r.*, p1.name as creator_name, p2.name as opponent_name
      FROM reservations r
      JOIN players p1 ON r.creator_id = p1.id
      JOIN players p2 ON r.opponent_id = p2.id
      WHERE (r.creator_id = ? OR r.opponent_id = ?)
        AND r.status = 'confirmed'
        AND r.scheduled_time > datetime('now')
      ORDER BY r.scheduled_time ASC
    `).all(userPlayer.id, userPlayer.id)

    res.json({ sent, received, confirmed })
  } catch (error) {
    console.error('Error fetching reservations:', error)
    res.status(500).json({ error: 'Failed to fetch reservations' })
  }
})

/**
 * PATCH /api/scheduling/:id — Accept or decline a reservation
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

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id)

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' })
    }

    if (reservation.opponent_id !== userPlayer.id) {
      return res.status(403).json({ error: 'Only the invited player can respond' })
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Reservation is no longer pending' })
    }

    if (new Date(reservation.scheduled_time) <= new Date()) {
      return res.status(400).json({ error: 'This reservation time has already passed' })
    }

    const newStatus = action === 'accept' ? 'confirmed' : 'declined'

    db.prepare(`
      UPDATE reservations SET status = ?, responded_at = datetime('now') WHERE id = ?
    `).run(newStatus, reservation.id)

    const updated = db.prepare(`
      SELECT r.*, p1.name as creator_name, p2.name as opponent_name
      FROM reservations r
      JOIN players p1 ON r.creator_id = p1.id
      JOIN players p2 ON r.opponent_id = p2.id
      WHERE r.id = ?
    `).get(reservation.id)

    res.json(updated)
  } catch (error) {
    console.error('Error responding to reservation:', error)
    res.status(500).json({ error: 'Failed to respond to reservation' })
  }
})

/**
 * DELETE /api/scheduling/:id — Cancel a reservation (creator only)
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const userPlayer = db.prepare('SELECT id FROM players WHERE user_id = ?').get(req.user.id)
    if (!userPlayer) {
      return res.status(403).json({ error: 'You must have a player profile' })
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id)

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' })
    }

    // Allow cancellation by either the creator or the opponent
    if (reservation.creator_id !== userPlayer.id && reservation.opponent_id !== userPlayer.id) {
      return res.status(403).json({ error: 'You can only cancel your own reservations' })
    }

    if (!['pending', 'confirmed'].includes(reservation.status)) {
      return res.status(400).json({ error: 'This reservation cannot be cancelled' })
    }

    db.prepare(`
      UPDATE reservations SET status = 'cancelled' WHERE id = ?
    `).run(reservation.id)

    res.json({ message: 'Reservation cancelled' })
  } catch (error) {
    console.error('Error cancelling reservation:', error)
    res.status(500).json({ error: 'Failed to cancel reservation' })
  }
})

export default router
