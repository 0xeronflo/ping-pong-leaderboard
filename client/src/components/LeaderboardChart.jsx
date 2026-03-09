import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { playersApi } from '../services/api'

const COLORS = [
  '#1F2023', '#3B82F6', '#10B981', '#EF4444', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'
]

function LeaderboardChart() {
  const [playerData, setPlayerData] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllEloHistory()
  }, [])

  const fetchAllEloHistory = async () => {
    try {
      setLoading(true)
      const data = await playersApi.getAllEloHistory()
      setPlayerData(data)

      // Build unified timeline: each game timestamp becomes a row
      // with each player's ELO at that point
      const allEvents = []
      data.forEach(player => {
        player.history.forEach(entry => {
          allEvents.push({
            played_at: entry.played_at,
            playerId: player.id,
            playerName: player.name,
            elo: Math.round(entry.elo_rating)
          })
        })
      })

      // Sort by time
      allEvents.sort((a, b) => new Date(a.played_at) - new Date(b.played_at))

      // Build chart rows: at each event, carry forward all players' latest ELO
      const currentElos = {}
      const rows = []

      allEvents.forEach((event, index) => {
        currentElos[event.playerName] = event.elo

        // Only create a row if this is a new timestamp or last event at this timestamp
        const nextEvent = allEvents[index + 1]
        const isLastAtTimestamp = !nextEvent || nextEvent.played_at !== event.played_at

        if (isLastAtTimestamp) {
          const row = {
            index: rows.length,
            date: new Date(event.played_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          }
          data.forEach(player => {
            if (currentElos[player.name] !== undefined) {
              row[player.name] = currentElos[player.name]
            }
          })
          rows.push(row)
        }
      })

      setChartData(rows)
    } catch (err) {
      console.error('Failed to load ELO histories:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="card">
        <p className="empty-state">No game history yet to display.</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const sorted = [...payload].sort((a, b) => b.value - a.value)
      return (
        <div style={{
          background: 'var(--bg-body)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {sorted.map((entry, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2px 0',
              fontSize: '13px'
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: entry.color, flexShrink: 0
              }} />
              <span style={{ fontWeight: 600, minWidth: '80px' }}>{entry.name}</span>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)'
      }}>
        {playerData.map((player, i) => (
          <div key={player.id} style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: COLORS[i % COLORS.length]
            }} />
            <span style={{ fontWeight: 500 }}>{player.name}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-secondary)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={12}
            tickLine={false}
            domain={['dataMin - 30', 'dataMax + 30']}
          />
          <Tooltip content={<CustomTooltip />} />
          {playerData.map((player, i) => (
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LeaderboardChart
