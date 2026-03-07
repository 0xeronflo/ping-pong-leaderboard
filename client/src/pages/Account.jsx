import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'
import '../styles/dashboard.css'

function Account() {
  const { user, isAuthenticated, updatePlayerName, logout } = useAuth()
  const navigate = useNavigate()

  // Change name state
  const [newPlayerName, setNewPlayerName] = useState('')
  const [nameChanging, setNameChanging] = useState(false)
  const [nameError, setNameError] = useState(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleNameChange = async (e) => {
    e.preventDefault()
    setNameError(null)
    setNameSuccess(false)
    if (!newPlayerName.trim()) return
    try {
      setNameChanging(true)
      await updatePlayerName(newPlayerName.trim())
      setNewPlayerName('')
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err) {
      setNameError(err.message)
    } finally {
      setNameChanging(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    try {
      setPasswordChanging(true)
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (!isAuthenticated) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <Link to="/" className="brand-name">Office Pong</Link>
        </header>
        <div className="card">
          <div className="empty-state">
            <p style={{ marginBottom: 'var(--space-md)' }}>
              You must be logged in to view account settings.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              <Link to="/login" className="btn btn-dark">Login</Link>
              <Link to="/register" className="btn btn-outline">Register</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <Link to="/" className="brand-name">Office Pong</Link>
        <nav className="header-nav">
          <Link to="/" className="btn btn-outline">Dashboard</Link>
        </nav>
      </header>

      <div className="page-header">
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">Manage your profile and settings</p>
      </div>

      {/* Profile info */}
      <section className="section">
        <h2 className="section-title">Profile</h2>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Username</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{user?.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Player Name</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{user?.playerName}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Change player name */}
      <section className="section">
        <h2 className="section-title">Change Player Name</h2>
        <div className="card">
          <form onSubmit={handleNameChange} className="game-form">
            <div className="form-group">
              <label className="form-label">New Player Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter new name"
                className="form-input"
              />
            </div>
            <button
              type="submit"
              disabled={nameChanging || !newPlayerName.trim()}
              className="btn btn-dark"
            >
              {nameChanging ? 'Saving...' : 'Update Name'}
            </button>
          </form>
          {nameError && <div className="alert alert-error" style={{ marginTop: 'var(--space-sm)' }}>{nameError}</div>}
          {nameSuccess && <div className="alert alert-success" style={{ marginTop: 'var(--space-sm)' }}>Player name updated!</div>}
        </div>
      </section>

      {/* Change password */}
      <section className="section">
        <h2 className="section-title">Change Password</h2>
        <div className="card">
          <form onSubmit={handlePasswordChange} className="game-form">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="form-input"
              />
            </div>
            <button
              type="submit"
              disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
              className="btn btn-dark"
            >
              {passwordChanging ? 'Updating...' : 'Update Password'}
            </button>
          </form>
          {passwordError && <div className="alert alert-error" style={{ marginTop: 'var(--space-sm)' }}>{passwordError}</div>}
          {passwordSuccess && <div className="alert alert-success" style={{ marginTop: 'var(--space-sm)' }}>Password updated!</div>}
        </div>
      </section>

      {/* Logout */}
      <section className="section">
        <div className="card">
          <button onClick={handleLogout} className="btn btn-outline full-width" style={{ color: '#EF4444', borderColor: '#EF4444' }}>
            Log Out
          </button>
        </div>
      </section>
    </div>
  )
}

export default Account
