import { useState, useEffect } from 'react'
import { playersApi } from '../services/api'

function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    fetchPlayers()
  }, [])

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
        Error loading leaderboard: {error}
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="card">
        <p className="text-secondary" style={{ textAlign: 'center', padding: '24px' }}>
          No players yet. Add players to get started!
        </p>
      </div>
    )
  }

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  return (
    <div className="card">
      <h2>Current Rankings</h2>

      <div className="leaderboard-table">
        <div className="leaderboard-table-header">
          <span className="col-rank">Rank</span>
          <span className="col-player">Player</span>
          <span className="col-elo">ELO</span>
          <span className="col-games">Games</span>
          <span className="col-record">W-L</span>
          <span className="col-winrate">Win Rate</span>
        </div>

        <div className="leaderboard-table-body">
          {players.map((player, index) => {
            const rank = index + 1
            return (
              <div key={player.id} className={`leaderboard-row ${rank <= 3 ? 'top-three' : ''}`}>
                <div className="col-rank">
                  <span className="rank-badge">
                    {getMedalEmoji(rank)}
                  </span>
                </div>
                <div className="col-player">
                  <span className="player-name">{player.name}</span>
                </div>
                <div className="col-elo">
                  <span className="elo-value">{Math.round(player.current_elo)}</span>
                </div>
                <div className="col-games">
                  <span className="text-secondary">{player.games_played}</span>
                </div>
                <div className="col-record">
                  <span className="wins">{player.wins}</span>
                  <span className="separator">-</span>
                  <span className="losses">{player.losses}</span>
                </div>
                <div className="col-winrate">
                  {player.games_played > 0 ? (
                    <span className="winrate-badge">
                      {player.win_rate}%
                    </span>
                  ) : (
                    <span className="text-secondary">N/A</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
