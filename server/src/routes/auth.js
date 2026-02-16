import express from 'express'
import db from '../db/database.js'
import { hashPassword, comparePassword, generateToken } from '../services/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { INITIAL_RATING } from '../services/elo.js'

const router = express.Router()

/**
 * POST /api/auth/register
 * Register a new user and create their player profile
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, playerName } = req.body

    // Validation
    if (!username || !password || !playerName) {
      return res.status(400).json({ error: 'Username, password, and player name are required' })
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (playerName.length < 2 || playerName.length > 100) {
      return res.status(400).json({ error: 'Player name must be between 2 and 100 characters' })
    }

    // Use db from import

    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Check if player name already exists
    const existingPlayer = db.prepare('SELECT id FROM players WHERE name = ?').get(playerName)
    if (existingPlayer) {
      return res.status(400).json({ error: 'Player name already taken' })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user and player in a transaction
    const createUserAndPlayer = db.transaction(() => {
      // Create user
      const userResult = db
        .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
        .run(username, passwordHash)

      const userId = userResult.lastInsertRowid

      // Create player linked to user
      const playerResult = db
        .prepare('INSERT INTO players (name, user_id, current_elo) VALUES (?, ?, ?)')
        .run(playerName, userId, INITIAL_RATING)

      const playerId = playerResult.lastInsertRowid

      return { userId, playerId }
    })

    const { userId, playerId } = createUserAndPlayer()

    // Generate token
    const token = generateToken({ id: userId, username })

    // Set cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Return user info
    res.status(201).json({
      user: {
        id: userId,
        username,
        playerId,
        playerName,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Use db from import

    // Get user from database
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Get player info
    const player = db.prepare('SELECT id, name FROM players WHERE user_id = ?').get(user.id)

    // Generate token
    const token = generateToken({ id: user.id, username: user.username })

    // Set cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Return user info
    res.json({
      user: {
        id: user.id,
        username: user.username,
        playerId: player?.id || null,
        playerName: player?.name || null,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('authToken')
  res.json({ message: 'Logged out successfully' })
})

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    // Use db from import

    // Get player info
    const player = db.prepare('SELECT id, name FROM players WHERE user_id = ?').get(req.user.id)

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        playerId: player?.id || null,
        playerName: player?.name || null,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

export default router
