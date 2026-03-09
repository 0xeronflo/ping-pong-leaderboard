import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { playersApi, challengesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import GameForm from '../components/GameForm'
import GameHistory from '../components/GameHistory'
import PlayerStats from '../components/PlayerStats'
import EloChart from '../components/EloChart'
import ChallengePanel from '../components/ChallengePanel'
import LeaderboardChart from '../components/LeaderboardChart'
import '../styles/dashboard.css'

function Dashboard() {
  const { isAuthenticated } = useAuth()
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingChallengeCount, setPendingChallengeCount] = useState(0)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [showGameForm, setShowGameForm] = useState(false)

  // Poll challenge count even when not on challenges tab
  const fetchChallengeCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await challengesApi.getAll()
      setPendingChallengeCount(data.received.length)
    } catch (err) {
      // silently ignore
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchChallengeCount()
    const interval = setInterval(fetchChallengeCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchChallengeCount])

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
    setShowGameForm(false)
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
      <header className="dashboard-header">
        <h1 className="brand-name">🏓 Office Pong</h1>
        <nav className="header-nav">
          <button
            className="btn btn-dark record-match-btn"
            onClick={() => setShowGameForm(true)}
          >
            + Record Match
          </button>
          {isAuthenticated && (
            <Link to="/account" className="btn btn-outline">Account</Link>
          )}
        </nav>
      </header>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
        {isAuthenticated && (
          <button
            className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            Challenges
            {pendingChallengeCount > 0 && (
              <span className="challenge-badge">{pendingChallengeCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'leaderboard' && (
        <>
          {/* ELO PROGRESSION CHART */}
          <section className="section">
            <h2 className="section-title">ELO Progression</h2>
            <LeaderboardChart key={`chart-${refreshKey}`} />
          </section>

          {/* LEADERBOARD TABLE */}
          <section className="section">
            <h2 className="section-title">Rankings</h2>
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
        </>
      )}

      {activeTab === 'history' && (
        <section className="section">
          <h2 className="section-title">Match History</h2>
          <GameHistory key={`history-${refreshKey}`} />
        </section>
      )}

      {activeTab === 'statistics' && (
        <>
          {players.length > 0 ? (
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
          ) : (
            <section className="section">
              <p className="empty-state">No players yet. Play some games to see statistics!</p>
            </section>
          )}
        </>
      )}

      {activeTab === 'challenges' && isAuthenticated && (
        <section className="section">
          <h2 className="section-title">Challenges</h2>
          <ChallengePanel onChallengeCountChange={setPendingChallengeCount} />
        </section>
      )}

      {/* Mobile FAB (visible only on small screens where header button is hidden) */}
      <button
        className="fab"
        onClick={() => setShowGameForm(true)}
        title="Record Match"
      >
        +
      </button>

      {/* Game Form Modal */}
      {showGameForm && (
        <div className="game-form-overlay" onClick={() => setShowGameForm(false)}>
          <div className="game-form-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h2 className="section-title">Record Match</h2>
              <button
                className="btn btn-outline"
                onClick={() => setShowGameForm(false)}
                style={{ padding: '4px 12px' }}
              >
                ✕
              </button>
            </div>
            <GameForm key={`form-${refreshKey}`} onGameCreated={handleGameCreated} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
