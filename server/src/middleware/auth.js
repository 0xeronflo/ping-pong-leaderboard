import { verifyToken } from '../services/auth.js'
import db from '../db/database.js'

/**
 * Authentication middleware
 * Verifies JWT token from cookies and attaches user to request
 */
export function requireAuth(req, res, next) {
  try {
    // Get token from cookie
    const token = req.cookies.authToken

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Verify token
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get user from database to ensure they still exist
    const user = db
      .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
      .get(payload.userId)

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Attach user to request
    req.user = user

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.authToken

    if (token) {
      const payload = verifyToken(token)

      if (payload) {
        const user = db
          .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
          .get(payload.userId)

        if (user) {
          req.user = user
        }
      }
    }

    next()
  } catch (error) {
    // Continue even if there's an error
    next()
  }
}
