import { useState, useEffect } from 'react'
import { playersApi, gamesApi } from '../services/api'
import GameForm from '../components/GameForm'
import GameHistory from '../components/GameHistory'
import PlayerStats from '../components/PlayerStats'
import EloChart from '../components/EloChart'
import '../styles/dashboard.css'

function Dashboard() {
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const playersData = await playersApi.getAll()
      setPlayers(playersData)

      // Select first player by default
      if (playersData.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(playersData[0].id)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGameCreated = () => {
    setRefreshKey((prev) => prev + 1)
    fetchData()
  }

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">🏓 Office Pong</h1>
      </header>

      {/* 1. GAME ENTRY */}
      <section className="section">
        <h2 className="section-title">Record Match</h2>
        <GameForm key={`form-${refreshKey}`} onGameCreated={handleGameCreated} />
      </section>

      {/* 2. LEADERBOARD */}
      <section className="section">
        <h2 className="section-title">Leaderboard</h2>
        <div className="card">
          {players.length === 0 ? (
            <p className="empty-state">No players yet. Add players to get started!</p>
          ) : (
            <div className="leaderboard-table">
              <div className="leaderboard-table-header">
                <span className="col-rank">Rank</span>
                <span className="col-player">Player</span>
                <span className="col-elo">ELO</span>
                <span className="col-games">Games</span>
                <span className="col-record">W-L</span>
                <span className="col-winrate">Win%</span>
              </div>
              <div className="leaderboard-table-body">
                {players.map((player, index) => {
                  const rank = index + 1
                  return (
                    <div key={player.id} className={`leaderboard-row ${rank <= 3 ? 'top-three' : ''}`}>
                      <div className="col-rank">
                        <span className="rank-badge">{getMedalEmoji(rank)}</span>
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
                          <span className="winrate-badge">{player.win_rate}%</span>
                        ) : (
                          <span className="text-secondary">N/A</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. MATCH HISTORY */}
      <section className="section">
        <h2 className="section-title">Match History</h2>
        <GameHistory key={`history-${refreshKey}`} />
      </section>

      {/* 4. PLAYER STATISTICS */}
      {players.length > 0 && (
        <section className="section">
          <h2 className="section-title">Player Statistics</h2>
          <div className="card player-selector-card">
            <label className="form-label">Select Player</label>
            <select
              value={selectedPlayerId || ''}
              onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
              className="form-select"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} (ELO: {Math.round(player.current_elo)})
                </option>
              ))}
            </select>
          </div>
          {selectedPlayerId && (
            <>
              <PlayerStats key={`stats-${selectedPlayerId}`} playerId={selectedPlayerId} />
              <EloChart key={`chart-${selectedPlayerId}`} playerId={selectedPlayerId} />
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default Dashboard
