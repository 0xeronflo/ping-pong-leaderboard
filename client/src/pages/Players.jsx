import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi } from '../services/api'
import '../styles/dashboard.css'

function Players() {
  const [players, setPlayers] = useState([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const data = await playersApi.getAll()
      setPlayers(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()

    if (!newPlayerName.trim()) {
      setError('Player name cannot be empty')
      return
    }

    try {
      setCreating(true)
      setError(null)
      await playersApi.create(newPlayerName.trim())
      setNewPlayerName('')
      setSuccess(true)
      await fetchPlayers()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h3 className="brand-name">Office Pong</h3>
        </div>
        <nav className="header-nav">
          <Link to="/" className="btn btn-outline">Dashboard</Link>
          <Link to="/game-entry" className="btn btn-outline">Game Entry</Link>
          <Link to="/statistics" className="btn btn-outline">Statistics</Link>
        </nav>
      </header>

      <div className="page-header">
        <div>
          <h1 className="page-title">Players</h1>
          <p className="page-subtitle">Manage players and view their profiles</p>
        </div>
      </div>

      {/* Add Player Form */}
      <div className="card">
        <h2>Add New Player</h2>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            Player added successfully!
          </div>
        )}

        <form onSubmit={handleAddPlayer} className="player-form">
          <div className="form-group">
            <label className="form-label">Player Name</label>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter player name"
              className="form-input"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="btn btn-dark"
          >
            {creating ? 'Adding...' : 'Add Player'}
          </button>
        </form>
      </div>

      {/* Players List */}
      <div className="card">
        <h2>All Players</h2>

        {loading ? (
          <div className="loading-container" style={{ padding: '48px' }}>
            <div className="spinner"></div>
          </div>
        ) : players.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '24px' }}>
            No players yet. Add your first player above!
          </p>
        ) : (
          <div className="players-grid">
            {players.map((player, index) => (
              <div key={player.id} className="player-card">
                <div className="player-card-header">
                  <div className="player-rank">#{index + 1}</div>
                  <div className="player-info">
                    <h3 className="player-card-name">{player.name}</h3>
                    <div className="player-elo">{Math.round(player.current_elo)} pts</div>
                  </div>
                </div>
                <div className="player-card-stats">
                  <div className="stat-item">
                    <div className="stat-value">{player.games_played}</div>
                    <div className="stat-label">Games</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value wins-value">{player.wins}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value losses-value">{player.losses}</div>
                    <div className="stat-label">Losses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {player.games_played > 0 ? `${player.win_rate}%` : 'N/A'}
                    </div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                </div>
                <div className="player-card-footer">
                  <span className="text-secondary" style={{ fontSize: '12px' }}>
                    Joined {new Date(player.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Players
