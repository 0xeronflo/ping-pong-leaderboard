import { useState } from 'react'
import { Link } from 'react-router-dom'
import Leaderboard from '../components/Leaderboard'
import GameForm from '../components/GameForm'
import GameHistory from '../components/GameHistory'
import '../styles/dashboard.css'

function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleGameCreated = () => {
    setRefreshKey((prev) => prev + 1)
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
          <Link to="/players" className="btn btn-outline">Players</Link>
          <Link to="/statistics" className="btn btn-outline">Statistics</Link>
        </nav>
      </header>

      <div className="page-header">
        <div>
          <h1 className="page-title">Game Entry & Leaderboard</h1>
          <p className="page-subtitle">Record matches and view current rankings</p>
        </div>
      </div>

      <Leaderboard key={`leaderboard-${refreshKey}`} />

      <div className="dashboard-grid">
        <GameForm onGameCreated={handleGameCreated} />
        <div className="game-history-wrapper">
          <GameHistory key={`history-${refreshKey}`} />
        </div>
      </div>
    </div>
  )
}

export default Home
