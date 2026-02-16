import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { playersApi } from '../services/api'

function EloChart({ playerId }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (playerId) {
      fetchEloHistory()
    }
  }, [playerId])

  const fetchEloHistory = async () => {
    try {
      setLoading(true)
      const history = await playersApi.getEloHistory(playerId)

      // Format data for Recharts
      const formattedData = history.map((entry, index) => ({
        game: index,
        elo: Math.round(entry.elo_rating),
        result: entry.result,
        date: new Date(entry.played_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }))

      setChartData(formattedData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!playerId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Select a player to view ELO progression</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading ELO history: {error}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No game history available for this player</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">
            Game {data.game} - {data.date}
          </p>
          <p className="text-lg font-bold text-blue-600">
            ELO: {data.elo}
          </p>
          {data.result !== 'start' && (
            <p className={`text-sm ${data.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
              {data.result === 'win' ? '✓ Win' : '✗ Loss'}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (payload.result === 'start') {
      return <circle cx={cx} cy={cy} r={4} fill="#3B82F6" />
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={payload.result === 'win' ? '#10B981' : '#EF4444'}
        stroke="#fff"
        strokeWidth={2}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">ELO Progression</h3>

      <div className="mb-4 flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="text-gray-600">Win</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-gray-600">Loss</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="game"
            label={{ value: 'Games Played', position: 'insideBottom', offset: -5 }}
            stroke="#6B7280"
          />
          <YAxis
            label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft' }}
            stroke="#6B7280"
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="elo"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={<CustomDot />}
            name="ELO Rating"
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default EloChart
