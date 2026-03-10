import { useState, useEffect, useCallback } from 'react'
import { playersApi, schedulingApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function SchedulingPanel({ onPendingCountChange }) {
  const { user, isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [opponentId, setOpponentId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [sent, setSent] = useState([])
  const [received, setReceived] = useState([])
  const [confirmed, setConfirmed] = useState([])
  const [sending, setSending] = useState(false)
  const [respondingId, setRespondingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchReservations = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await schedulingApi.getAll()
      setSent(data.sent)
      setReceived(data.received)
      setConfirmed(data.confirmed)
      if (onPendingCountChange) {
        onPendingCountChange(data.received.length)
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err)
    }
  }, [isAuthenticated, onPendingCountChange])

  useEffect(() => {
    if (!isAuthenticated) return
    playersApi.getAll().then(setPlayers).catch(() => {})
    fetchReservations()
    const interval = setInterval(fetchReservations, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchReservations])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!opponentId || !scheduledDate || !scheduledTime) return
    setError(null)
    setSuccess(null)
    try {
      setSending(true)
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      await schedulingApi.create(parseInt(opponentId), dateTime.toISOString())
      setOpponentId('')
      setScheduledDate('')
      setScheduledTime('')
      setSuccess('Reservation request sent!')
      fetchReservations()
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
      await schedulingApi.respond(id, action)
      if (action === 'accept') {
        setSuccess('Reservation confirmed!')
      }
      fetchReservations()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  const handleCancel = async (id) => {
    setError(null)
    setSuccess(null)
    try {
      setCancellingId(id)
      await schedulingApi.cancel(id)
      setSuccess('Reservation cancelled')
      fetchReservations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${timeStr}`
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }) + ` at ${timeStr}`
  }

  // Get minimum date (today) for the date picker
  const today = new Date().toISOString().split('T')[0]

  if (!isAuthenticated) return null

  const opponents = players.filter(p => p.id !== user?.playerId)

  return (
    <div className="card">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Reserve Table Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <label className="form-label">Reserve the table</label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
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
          <div className="form-group" style={{ flex: 0, minWidth: '140px', margin: 0 }}>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={today}
              className="form-input"
            />
          </div>
          <div className="form-group" style={{ flex: 0, minWidth: '110px', margin: 0 }}>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={sending || !opponentId || !scheduledDate || !scheduledTime}
          className="btn btn-dark"
          style={{ alignSelf: 'flex-start' }}
        >
          {sending ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      {/* Confirmed Reservations */}
      {confirmed.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Upcoming
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {confirmed.map((r) => {
              const otherPlayer = r.creator_id === user?.playerId ? r.opponent_name : r.creator_name
              return (
                <div key={r.id} className="challenge-item" style={{ borderLeft: '3px solid #10B981' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>vs {otherPlayer}</span>
                    <span className="schedule-time">{formatDateTime(r.scheduled_time)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="confirmed-badge">Confirmed</span>
                    <button
                      onClick={() => handleCancel(r.id)}
                      disabled={cancellingId === r.id}
                      className="btn btn-outline"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Incoming Invitations */}
      {received.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Incoming Invites
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {received.map((r) => (
              <div key={r.id} className="challenge-item">
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{r.creator_name}</span>
                  <span className="schedule-time">{formatDateTime(r.scheduled_time)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleRespond(r.id, 'accept')}
                    disabled={respondingId === r.id}
                    className="btn btn-dark"
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(r.id, 'decline')}
                    disabled={respondingId === r.id}
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

      {/* Sent Invitations */}
      {sent.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Sent Invites
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sent.map((r) => (
              <div key={r.id} className="challenge-item" style={{ opacity: 0.7 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{r.opponent_name}</span>
                  <span className="schedule-time">{formatDateTime(r.scheduled_time)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</span>
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={cancellingId === r.id}
                    className="btn btn-outline"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {received.length === 0 && sent.length === 0 && confirmed.length === 0 && (
        <p style={{ margin: 'var(--space-md) 0 0', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          No reservations yet. Reserve the table to get started!
        </p>
      )}
    </div>
  )
}

export default SchedulingPanel
