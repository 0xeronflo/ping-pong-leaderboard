import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi } from '../services/api'
import PlayerStats from '../components/PlayerStats'
import EloChart from '../components/EloChart'
import '../styles/dashboard.css'

function Statistics() {
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const data = await playersApi.getAll()
      setPlayers(data)
      if (data.length > 0) {
        setSelectedPlayerId(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <h3 className="brand-name">Office Pong</h3>
          </div>
          <nav className="header-nav">
            <Link to="/" className="btn btn-outline">Dashboard</Link>
            <Link to="/game-entry" className="btn btn-outline">Game Entry</Link>
            <Link to="/players" className="btn btn-outline">Players</Link>
          </nav>
        </header>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <h3 className="brand-name">Office Pong</h3>
          </div>
          <nav className="header-nav">
            <Link to="/" className="btn btn-outline">Dashboard</Link>
            <Link to="/game-entry" className="btn btn-outline">Game Entry</Link>
            <Link to="/players" className="btn btn-outline">Players</Link>
          </nav>
        </header>
        <div className="page-header">
          <div>
            <h1 className="page-title">Statistics</h1>
            <p className="page-subtitle">Detailed player statistics and ELO progression</p>
          </div>
        </div>
        <div className="card">
          <p className="text-secondary" style={{ textAlign: 'center', padding: '24px' }}>
            No players yet. Add players and play some games to see statistics!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h3 className="brand-name">Office Pong</h3>
        </div>
        <nav className="header-nav">
          <Link to="/" className="btn btn-outline">Dashboard</Link>
          <Link to="/game-entry" className="btn btn-outline">Game Entry</Link>
          <Link to="/players" className="btn btn-outline">Players</Link>
        </nav>
      </header>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistics</h1>
          <p className="page-subtitle">Detailed player statistics and ELO progression</p>
        </div>
      </div>

      {/* Player Selector */}
      <div className="card">
        <h2>Select Player</h2>
        <select
          value={selectedPlayerId || ''}
          onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
          className="form-select"
          style={{ maxWidth: '400px' }}
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} (ELO: {Math.round(player.current_elo)})
            </option>
          ))}
        </select>
      </div>

      {/* Player Statistics */}
      {selectedPlayerId && <PlayerStats playerId={selectedPlayerId} />}

      {/* ELO Chart */}
      {selectedPlayerId && <EloChart playerId={selectedPlayerId} />}
    </div>
  )
}

export default Statistics
