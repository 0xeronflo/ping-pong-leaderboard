import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi, gamesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function GameForm({ onGameCreated }) {
  const { user, isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [player2Id, setPlayer2Id] = useState('')
  const [player1Score, setPlayer1Score] = useState('')
  const [player2Score, setPlayer2Score] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const data = await playersApi.getAll()
      setPlayers(data)
    } catch (err) {
      setError('Failed to load players')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!isAuthenticated || !user?.playerId) {
      setError('You must be logged in to record games')
      return
    }

    if (!player2Id || player1Score === '' || player2Score === '') {
      setError('Please fill in all fields')
      return
    }

    if (user.playerId === parseInt(player2Id)) {
      setError('You cannot play against yourself')
      return
    }

    if (player1Score === player2Score) {
      setError('Game cannot be a tie')
      return
    }

    try {
      setLoading(true)
      await gamesApi.create({
        player1_id: user.playerId,
        player2_id: parseInt(player2Id),
        player1_score: parseInt(player1Score),
        player2_score: parseInt(player2Score),
      })

      setSuccess(true)
      setPlayer2Id('')
      setPlayer1Score('')
      setPlayer2Score('')

      if (onGameCreated) {
        onGameCreated()
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter out current user from opponents list
  const opponents = players.filter(p => p.id !== user?.playerId)
  const currentPlayer = players.find(p => p.id === user?.playerId)

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="card">
        <div className="empty-state">
          <p style={{ marginBottom: 'var(--space-md)' }}>
            You must be logged in to record matches
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-dark">Login</Link>
            <Link to="/register" className="btn btn-outline">Register</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          Match recorded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="game-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">You (Player 1)</label>
            <input
              type="text"
              value={currentPlayer?.name || 'Loading...'}
              className="form-input"
              disabled
              style={{ background: 'var(--bg-body)', color: 'var(--text-secondary)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Opponent (Player 2)</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="form-select"
            >
              <option value="">Select Opponent</option>
              {opponents.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} (ELO: {Math.round(player.current_elo)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Your Score</label>
            <input
              type="number"
              min="0"
              value={player1Score}
              onChange={(e) => setPlayer1Score(e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Opponent Score</label>
            <input
              type="number"
              min="0"
              value={player2Score}
              onChange={(e) => setPlayer2Score(e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || opponents.length === 0}
          className="btn btn-dark full-width"
        >
          {loading ? 'Recording...' : 'Record Match'}
        </button>

        {opponents.length === 0 && (
          <p className="form-hint">
            No other players available. At least one other player is needed to record a match.
          </p>
        )}
      </form>
    </div>
  )
}

export default GameForm
