import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi, gamesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function GameForm({ onGameCreated }) {
  const { user, isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [player2Id, setPlayer2Id] = useState('')
  const [sets, setSets] = useState([{ player1_score: '', player2_score: '' }])
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

  const handleSetScoreChange = (index, player, value) => {
    const newSets = [...sets]
    newSets[index][player] = value
    setSets(newSets)
  }

  const addSet = () => {
    setSets([...sets, { player1_score: '', player2_score: '' }])
  }

  const removeSet = (index) => {
    if (sets.length > 1) {
      const newSets = sets.filter((_, i) => i !== index)
      setSets(newSets)
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

    if (!player2Id) {
      setError('Please select an opponent')
      return
    }

    if (user.playerId === parseInt(player2Id)) {
      setError('You cannot play against yourself')
      return
    }

    // Validate all sets have scores
    for (let i = 0; i < sets.length; i++) {
      if (sets[i].player1_score === '' || sets[i].player2_score === '') {
        setError(`Please fill in scores for Set ${i + 1}`)
        return
      }
    }

    // Convert to numbers and validate
    const parsedSets = sets.map(set => ({
      player1_score: parseInt(set.player1_score),
      player2_score: parseInt(set.player2_score)
    }))

    // Check for ties in sets
    for (let i = 0; i < parsedSets.length; i++) {
      if (parsedSets[i].player1_score === parsedSets[i].player2_score) {
        setError(`Set ${i + 1} cannot be a tie`)
        return
      }
    }

    // Calculate sets won
    let player1SetsWon = 0
    let player2SetsWon = 0
    parsedSets.forEach(set => {
      if (set.player1_score > set.player2_score) {
        player1SetsWon++
      } else {
        player2SetsWon++
      }
    })

    if (player1SetsWon === player2SetsWon) {
      setError('Match cannot be tied - one player must win more sets')
      return
    }

    try {
      setLoading(true)
      await gamesApi.create({
        player1_id: user.playerId,
        player2_id: parseInt(player2Id),
        sets: parsedSets
      })

      setSuccess(true)
      setPlayer2Id('')
      setSets([{ player1_score: '', player2_score: '' }])

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

        <div style={{ marginTop: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Sets</h3>
            <button
              type="button"
              onClick={addSet}
              className="btn btn-outline"
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              + Add Set
            </button>
          </div>

          {sets.map((set, index) => (
            <div key={index} style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ minWidth: '60px', fontSize: '14px', fontWeight: 500 }}>
                  Set {index + 1}:
                </span>
                <div className="form-row" style={{ flex: 1, margin: 0 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={set.player1_score}
                      onChange={(e) => handleSetScoreChange(index, 'player1_score', e.target.value)}
                      className="form-input"
                      placeholder="Your score"
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                  <span style={{ padding: '0 8px', fontSize: '18px', fontWeight: 600 }}>-</span>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={set.player2_score}
                      onChange={(e) => handleSetScoreChange(index, 'player2_score', e.target.value)}
                      className="form-input"
                      placeholder="Opp score"
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                </div>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--red)' }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || opponents.length === 0}
          className="btn btn-dark full-width"
          style={{ marginTop: 'var(--space-md)' }}
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
