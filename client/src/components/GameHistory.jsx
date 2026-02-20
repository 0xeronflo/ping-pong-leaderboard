import { useState, useEffect } from 'react'
import { gamesApi } from '../services/api'

const PAGE_SIZE = 10

function GameHistory() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)

  const fetchGames = async () => {
    try {
      setLoading(true)
      const data = await gamesApi.getAll(100, 0)
      setGames(data.games)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
        Error loading game history: {error}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="card">
        <p className="empty-state">
          No matches recorded yet. Start playing!
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(games.length / PAGE_SIZE)
  const pageGames = games.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="card">
      <div className="match-list">
        {pageGames.map((game) => (
          <div key={game.id} className="history-item">
            <div className="history-header">
              <div className="history-players">
                <span className={game.winner_id === game.player1_id ? 'winner' : ''}>
                  {game.player1_name}
                </span>
                <span className="vs">vs</span>
                <span className={game.winner_id === game.player2_id ? 'winner' : ''}>
                  {game.player2_name}
                </span>
              </div>
              <span className="history-date">{formatDate(game.played_at)}</span>
            </div>

            <div className="history-details">
              <div className="history-score">
                <span className="score-pill">
                  {game.player1_score} - {game.player2_score} sets
                </span>
                {game.sets && (() => {
                  const parsedSets = JSON.parse(game.sets)
                  return (
                    <div className="set-scores">
                      {parsedSets.map((set, i) => (
                        <span key={i} className="set-score-pill">
                          {set.player1_score}–{set.player2_score}
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </div>

              <div className="elo-changes">
                <div className="elo-change-item">
                  <span className="player-label">{game.player1_name}:</span>
                  <span className="elo-before">{Math.round(game.player1_elo_before)}</span>
                  <span className="arrow">→</span>
                  <span className="elo-after">{Math.round(game.player1_elo_after)}</span>
                  <span className={`elo-delta ${game.winner_id === game.player1_id ? 'positive' : 'negative'}`}>
                    {game.winner_id === game.player1_id ? '+' : '-'}{Math.abs(Math.round(game.elo_change))}
                  </span>
                </div>
                <div className="elo-change-item">
                  <span className="player-label">{game.player2_name}:</span>
                  <span className="elo-before">{Math.round(game.player2_elo_before)}</span>
                  <span className="arrow">→</span>
                  <span className="elo-after">{Math.round(game.player2_elo_after)}</span>
                  <span className={`elo-delta ${game.winner_id === game.player2_id ? 'positive' : 'negative'}`}>
                    {game.winner_id === game.player2_id ? '+' : '-'}{Math.abs(Math.round(game.elo_change))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-light)' }}>
          <button
            className="btn btn-outline"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages - 1}
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default GameHistory
