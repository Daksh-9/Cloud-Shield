import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userService } from '../services/user'
import { authService } from '../services/auth'

function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile state
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [profileLoading, setProfileLoading] = useState(true)

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Settings state
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Activities state
  const [activities, setActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Sessions state
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Admin: Manage Analysts state
  const [allUsers, setAllUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    loadInitialData()
  }, [navigate])

  const loadInitialData = async () => {
    await Promise.all([
      loadProfile(),
      loadSettings()
    ])
  }

  const loadProfile = async () => {
    setProfileLoading(true)
    try {
      const data = await userService.getProfile()
      setProfile({ full_name: data.full_name || '', email: data.email || '' })
    } catch (err) {
      setError('Failed to load profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const loadSettings = async () => {
    setSettingsLoading(true)
    try {
      const data = await userService.getSettings()
      setSettings(data)
    } catch (err) {
      setError('Failed to load settings.')
    } finally {
      setSettingsLoading(false)
    }
  }

  const loadActivities = async () => {
    setActivitiesLoading(true)
    try {
      const data = await userService.getActivities({ limit: 100 })
      setActivities(data)
    } catch (err) {
      setError('Failed to load activities.')
    } finally {
      setActivitiesLoading(false)
    }
  }

  const loadSessions = async () => {
    setSessionsLoading(true)
    try {
      const data = await userService.getSessions()
      setSessions(data)
    } catch (err) {
      setError('Failed to load sessions.')
    } finally {
      setSessionsLoading(false)
    }
  }

  const loadAllUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await userService.getAllUsers()
      setAllUsers(data)
    } catch (err) {
      setError('Failed to load users. Admin privileges required.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities()
    } else if (activeTab === 'sessions') {
      loadSessions()
    } else if (activeTab === 'manage_analysts') {
      loadAllUsers()
    }
  }, [activeTab])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await userService.updateProfile({
        full_name: profile.full_name,
        email: profile.email
      })
      setSuccess('Profile updated successfully!')
      await loadProfile()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match.')
      return
    }

    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await userService.changePassword(
        passwordData.current_password,
        passwordData.new_password
      )
      setSuccess('Password changed successfully!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsUpdate = async (section, data) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const updateData = {}
      updateData[section] = data
      
      const updated = await userService.updateSettings(updateData)
      setSettings(updated)
      setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully!`)
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to update ${section} settings.`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) return

    try {
      await userService.revokeSession(sessionId)
      setSuccess('Session revoked successfully!')
      await loadSessions()
    } catch (err) {
      setError('Failed to revoke session.')
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to revoke all other sessions? You will remain logged in on this device.')) return

    try {
      await userService.revokeAllSessions()
      setSuccess('All other sessions revoked successfully!')
      await loadSessions()
    } catch (err) {
      setError('Failed to revoke sessions.')
    }
  }

  const handleDeleteAccount = async () => {
    const confirm1 = window.prompt('Type "DELETE" to confirm account deletion:')
    if (confirm1 !== 'DELETE') return

    const confirm2 = window.confirm('This action cannot be undone. Are you absolutely sure?')
    if (!confirm2) return

    try {
      await userService.deleteAccount()
      authService.logout()
      navigate('/login')
    } catch (err) {
      setError('Failed to delete account.')
    }
  }

  const handleToggleUserStatus = async (user) => {
    try {
      if (user.is_active) {
        await userService.deactivateUser(user.id)
        setSuccess(`User ${user.email} deactivated.`)
      } else {
        await userService.reactivateUser(user.id)
        setSuccess(`User ${user.email} reactivated.`)
      }
      await loadAllUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a1a' }}>Settings</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #ddd', flexWrap: 'wrap' }}>
        {['profile', 'password', 'preferences', 'notifications', 'dashboard', 'activities', 'sessions', 'manage_analysts', 'danger'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab ? '#2196F3' : 'transparent',
              color: activeTab === tab ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #2196F3' : 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '-2px',
              textTransform: 'capitalize'
            }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#efe',
          color: '#3c3',
          borderRadius: '4px',
          border: '1px solid #cfc'
        }}>
          {success}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Profile Information</h2>
          
          {profileLoading ? (
            <p>Loading profile...</p>
          ) : (
            <form onSubmit={handleProfileUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading ? '#ccc' : '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Change Password</h2>
          
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={8}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>Minimum 8 characters</small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                minLength={8}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && settings && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Preferences</h2>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSettingsUpdate('preferences', settings.preferences)
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Theme
                </label>
                <select
                  value={settings.preferences.theme}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, theme: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Language
                </label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, language: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Timezone
                </label>
                <input
                  type="text"
                  value={settings.preferences.timezone}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, timezone: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Time Format
                </label>
                <select
                  value={settings.preferences.time_format}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, time_format: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="24h">24 Hour</option>
                  <option value="12h">12 Hour</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Items Per Page
                </label>
                <input
                  type="number"
                  value={settings.preferences.items_per_page}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, items_per_page: parseInt(e.target.value) }
                  })}
                  min="10"
                  max="500"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && settings && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Notification Preferences</h2>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSettingsUpdate('notifications', settings.notifications)
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'email_notifications', label: 'Email Notifications' },
                { key: 'alert_notifications', label: 'Alert Notifications' },
                { key: 'critical_alerts_only', label: 'Critical Alerts Only' },
                { key: 'log_notifications', label: 'Log Notifications' },
                { key: 'ml_detection_notifications', label: 'ML Detection Notifications' },
                { key: 'suricata_notifications', label: 'Suricata Notifications' },
                { key: 'notification_sound', label: 'Notification Sound' },
                { key: 'notification_desktop', label: 'Desktop Notifications' }
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.notifications[item.key]}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, [item.key]: e.target.checked }
                    })}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Saving...' : 'Save Notification Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && settings && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Dashboard Preferences</h2>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSettingsUpdate('dashboard', settings.dashboard)
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Default View
                </label>
                <select
                  value={settings.dashboard.default_view}
                  onChange={(e) => setSettings({
                    ...settings,
                    dashboard: { ...settings.dashboard, default_view: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="overview">Overview</option>
                  <option value="logs">Logs</option>
                  <option value="alerts">Alerts</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.dashboard.refresh_interval}
                  onChange={(e) => setSettings({
                    ...settings,
                    dashboard: { ...settings.dashboard, refresh_interval: parseInt(e.target.value) }
                  })}
                  min="5"
                  max="300"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                  Chart Type
                </label>
                <select
                  value={settings.dashboard.chart_type}
                  onChange={(e) => setSettings({
                    ...settings,
                    dashboard: { ...settings.dashboard, chart_type: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="line">Line</option>
                  <option value="bar">Bar</option>
                  <option value="pie">Pie</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.dashboard.show_recent_activity}
                  onChange={(e) => setSettings({
                    ...settings,
                    dashboard: { ...settings.dashboard, show_recent_activity: e.target.checked }
                  })}
                />
                <span>Show Recent Activity</span>
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.dashboard.show_statistics}
                  onChange={(e) => setSettings({
                    ...settings,
                    dashboard: { ...settings.dashboard, show_statistics: e.target.checked }
                  })}
                />
                <span>Show Statistics Cards</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Saving...' : 'Save Dashboard Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Activity History</h2>
          
          {activitiesLoading ? (
            <p>Loading activities...</p>
          ) : activities.length === 0 ? (
            <p style={{ color: '#666' }}>No activities found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong style={{ textTransform: 'capitalize' }}>
                        {activity.activity_type.replace('_', ' ')}
                      </strong>
                      <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                        {formatDate(activity.timestamp)}
                      </div>
                      {activity.ip_address && (
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                          IP: {activity.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#333' }}>Active Sessions</h2>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#FF9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Revoke All Other Sessions
              </button>
            )}
          </div>
          
          {sessionsLoading ? (
            <p>Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: '#666' }}>No active sessions found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {session.ip_address || 'Unknown IP'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      {session.user_agent || 'Unknown User Agent'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Last activity: {formatDate(session.last_activity)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Created: {formatDate(session.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#F44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manage Analysts Tab */}
      {activeTab === 'manage_analysts' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Manage System Users</h2>
          {usersLoading ? (
            <p>Loading users...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {allUsers.map(user => (
                <div key={user.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: user.is_active ? '#fff' : '#f5f5f5' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>{user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: user.is_active ? '#4CAF50' : '#F44336' }}>
                      Status: {user.is_active ? 'Active' : 'Deactivated'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: user.is_active ? '#F44336' : '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {user.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '2px solid #F44336'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#F44336' }}>Danger Zone</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>Delete Account</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#F44336',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings