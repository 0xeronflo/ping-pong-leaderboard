import { useState, useEffect, useCallback } from 'react'
import { playersApi, schedulingApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// Generate 15-min time slots from 8:00 AM to 8:00 PM
function generateTimeSlots() {
  const slots = []
  for (let h = 8; h < 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0')
      const min = m.toString().padStart(2, '0')
      slots.push(`${hour}:${min}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function formatSlot(slot) {
  const [h, m] = slot.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function SchedulingPanel({ onPendingCountChange }) {
  const { user, isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [opponentId, setOpponentId] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [sent, setSent] = useState([])
  const [received, setReceived] = useState([])
  const [confirmed, setConfirmed] = useState([])
  const [todaySchedule, setTodaySchedule] = useState([])
  const [sending, setSending] = useState(false)
  const [respondingId, setRespondingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchTodaySchedule = useCallback(async () => {
    try {
      const data = await schedulingApi.getToday()
      setTodaySchedule(data)
    } catch (err) {
      console.error('Failed to fetch today schedule:', err)
    }
  }, [])

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
    fetchTodaySchedule()
    const interval = setInterval(fetchTodaySchedule, 30000)
    return () => clearInterval(interval)
  }, [fetchTodaySchedule])

  useEffect(() => {
    if (!isAuthenticated) return
    playersApi.getAll().then(setPlayers).catch(() => {})
    fetchReservations()
    const interval = setInterval(fetchReservations, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchReservations])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!opponentId || !selectedSlot) return
    setError(null)
    setSuccess(null)
    try {
      setSending(true)
      const now = new Date()
      const [h, m] = selectedSlot.split(':').map(Number)
      const dateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
      await schedulingApi.create(parseInt(opponentId), dateTime.toISOString())
      setOpponentId('')
      setSelectedSlot('')
      setSuccess('Invite sent!')
      fetchReservations()
      fetchTodaySchedule()
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
      fetchTodaySchedule()
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
      fetchTodaySchedule()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Build a map of booked slots for today
  const bookedSlots = {}
  todaySchedule.forEach(r => {
    const date = new Date(r.scheduled_time)
    const slotKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    bookedSlots[slotKey] = r
  })

  // Filter out past slots
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const availableSlots = TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m > currentMinutes
  })

  const opponents = isAuthenticated ? players.filter(p => p.id !== user?.playerId) : []

  return (
    <>
      {/* Today's Table Schedule - visible to everyone */}
      <div className="card">
        <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          Today's Table
        </h3>
        <div className="time-slot-grid">
          {availableSlots.map(slot => {
            const booking = bookedSlots[slot]
            const isBooked = !!booking
            const isConfirmed = booking?.status === 'confirmed'
            const isPending = booking?.status === 'pending'

            return (
              <div
                key={slot}
                className={`time-slot ${isConfirmed ? 'time-slot-confirmed' : ''} ${isPending ? 'time-slot-pending' : ''} ${!isBooked && isAuthenticated ? 'time-slot-available' : ''}`}
                onClick={() => {
                  if (!isBooked && isAuthenticated) {
                    setSelectedSlot(slot)
                  }
                }}
              >
                <span className="time-slot-label">{formatSlot(slot)}</span>
                {isConfirmed && (
                  <span className="time-slot-info">{booking.creator_name} vs {booking.opponent_name}</span>
                )}
                {isPending && (
                  <span className="time-slot-info time-slot-info-pending">{booking.creator_name} vs {booking.opponent_name} (pending)</span>
                )}
                {!isBooked && (
                  <span className="time-slot-info time-slot-info-open">Open</span>
                )}
              </div>
            )
          })}
          {availableSlots.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: 'var(--space-md)' }}>
              No more slots available today.
            </p>
          )}
        </div>
      </div>

      {/* Booking Form + My Reservations - auth only */}
      {isAuthenticated && (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Book a slot */}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
              <label className="form-label">Book a slot</label>
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
            <div className="form-group" style={{ flex: 0, minWidth: '130px', margin: 0 }}>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="form-select"
              >
                <option value="">Select time</option>
                {availableSlots.filter(s => !bookedSlots[s]).map(slot => (
                  <option key={slot} value={slot}>{formatSlot(slot)}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={sending || !opponentId || !selectedSlot}
              className="btn btn-dark"
            >
              {sending ? 'Sending...' : 'Send Invite'}
            </button>
          </form>

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
                      <span className="schedule-time">{formatTime(r.scheduled_time)}</span>
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

          {/* My Confirmed */}
          {confirmed.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                My Reservations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {confirmed.map((r) => {
                  const otherPlayer = r.creator_id === user?.playerId ? r.opponent_name : r.creator_name
                  return (
                    <div key={r.id} className="challenge-item" style={{ borderLeft: '3px solid #10B981' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>vs {otherPlayer}</span>
                        <span className="schedule-time">{formatTime(r.scheduled_time)}</span>
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
                      <span className="schedule-time">{formatTime(r.scheduled_time)}</span>
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
        </div>
      )}
    </>
  )
}

export default SchedulingPanel
