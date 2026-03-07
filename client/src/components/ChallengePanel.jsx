import { useState, useEffect, useCallback } from 'react'
import { playersApi, challengesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function ChallengePanel({ onChallengeCountChange }) {
  const { user, isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [opponentId, setOpponentId] = useState('')
  const [sent, setSent] = useState([])
  const [received, setReceived] = useState([])
  const [sending, setSending] = useState(false)
  const [respondingId, setRespondingId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchChallenges = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await challengesApi.getAll()
      setSent(data.sent)
      setReceived(data.received)
      if (onChallengeCountChange) {
        onChallengeCountChange(data.received.length)
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err)
    }
  }, [isAuthenticated, onChallengeCountChange])

  useEffect(() => {
    if (!isAuthenticated) return
    playersApi.getAll().then(setPlayers).catch(() => {})
    fetchChallenges()
    const interval = setInterval(fetchChallenges, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchChallenges])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!opponentId) return
    setError(null)
    setSuccess(null)
    try {
      setSending(true)
      await challengesApi.create(parseInt(opponentId))
      setOpponentId('')
      setSuccess('Challenge sent!')
      fetchChallenges()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleRespond = async (id, action) => {
    setError(null)
    setSuccess(null)
    try {
      setRespondingId(id)
      await challengesApi.respond(id, action)
      if (action === 'accept') {
        setSuccess('Challenge accepted! Record the match result below.')
      }
      fetchChallenges()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date()
    const expires = new Date(expiresAt + 'Z')
    const diffMs = expires - now
    if (diffMs <= 0) return 'Expired'
    const mins = Math.ceil(diffMs / 60000)
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`
    return `${mins}m left`
  }

  if (!isAuthenticated) return null

  const opponents = players.filter(p => p.id !== user?.playerId)

  return (
    <div className="card">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Send Challenge */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
          <label className="form-label">Challenge a player</label>
          <select
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            className="form-select"
          >
            <option value="">Select opponent</option>
            {opponents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={sending || !opponentId}
          className="btn btn-dark"
        >
          {sending ? 'Sending...' : 'Send Challenge'}
        </button>
      </form>

      {/* Incoming Challenges */}
      {received.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Incoming
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {received.map((c) => (
              <div key={c.id} className="challenge-item">
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{c.challenger_name}</span>
                  <span className="challenge-time">{formatTimeRemaining(c.expires_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleRespond(c.id, 'accept')}
                    disabled={respondingId === c.id}
                    className="btn btn-dark"
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(c.id, 'decline')}
                    disabled={respondingId === c.id}
                    className="btn btn-outline"
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Challenges */}
      {sent.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Sent
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sent.map((c) => (
              <div key={c.id} className="challenge-item" style={{ opacity: 0.7 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{c.opponent_name}</span>
                  <span className="challenge-time">{formatTimeRemaining(c.expires_at)}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {received.length === 0 && sent.length === 0 && (
        <p style={{ margin: 'var(--space-md) 0 0', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          No active challenges. Send one to get started!
        </p>
      )}
    </div>
  )
}

export default ChallengePanel
