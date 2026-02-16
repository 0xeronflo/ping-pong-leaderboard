import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Players from './pages/Players'
import Statistics from './pages/Statistics'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/game-entry" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
