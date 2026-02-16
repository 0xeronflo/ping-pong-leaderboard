import { useState, useEffect } from 'react'
import { playersApi } from '../services/api'

function PlayerStats({ playerId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (playerId) {
      fetchStats()
    }
  }, [playerId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await playersApi.getStats(playerId)
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="loading-container" style={{ padding: '48px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        Error loading statistics: {error}
      </div>
    )
  }

  if (!stats) return null

  const { player, biggest_gain, biggest_loss, current_streak, streak_type, head_to_head } = stats
  const winRate = player.games_played > 0
    ? ((player.wins / player.games_played) * 100).toFixed(1)
    : 0

  return (
    <>
      {/* Player Overview */}
      <div className="card">
        <div className="stats-overview">
          <div className="stat-box">
            <div className="stat-box-value">{Math.round(player.current_elo)}</div>
            <div className="stat-box-label">Current ELO</div>
          </div>

          <div className="stat-box">
            <div className="stat-box-value">{player.games_played}</div>
            <div className="stat-box-label">Games Played</div>
          </div>

          <div className="stat-box positive">
            <div className="stat-box-value">{player.wins}</div>
            <div className="stat-box-label">Wins</div>
          </div>

          <div className="stat-box negative">
            <div className="stat-box-value">{player.losses}</div>
            <div className="stat-box-label">Losses</div>
          </div>

          <div className="stat-box">
            <div className="stat-box-value">{winRate}%</div>
            <div className="stat-box-label">Win Rate</div>
          </div>

          <div className="stat-box positive">
            <div className="stat-box-value">+{Math.round(biggest_gain)}</div>
            <div className="stat-box-label">Best Gain</div>
          </div>

          <div className="stat-box negative">
            <div className="stat-box-value">{Math.round(biggest_loss)}</div>
            <div className="stat-box-label">Worst Loss</div>
          </div>

          {current_streak > 0 && (
            <div className={`stat-box ${streak_type === 'win' ? 'positive' : 'negative'}`}>
              <div className="stat-box-value">
                {current_streak} {streak_type === 'win' ? '🔥' : '💀'}
              </div>
              <div className="stat-box-label">
                {streak_type === 'win' ? 'Win' : 'Loss'} Streak
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Head-to-Head Records */}
      {head_to_head.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            Head-to-Head Records
          </h3>
          <div className="h2h-table">
            <div className="h2h-row">
              <span>Opponent</span>
              <span>Games</span>
              <span>Wins</span>
              <span>Losses</span>
              <span>Win Rate</span>
            </div>
            {head_to_head.map((record) => {
              const h2hWinRate = ((record.wins / record.total_games) * 100).toFixed(1)
              return (
                <div key={record.opponent_id} className="h2h-row">
                  <span style={{ fontWeight: 600 }}>{record.opponent_name}</span>
                  <span className="text-secondary">{record.total_games}</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>{record.wins}</span>
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>{record.losses}</span>
                  <span className="winrate-badge">{h2hWinRate}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export default PlayerStats
