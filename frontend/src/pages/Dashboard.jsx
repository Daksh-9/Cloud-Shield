import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { authService } from '../services/auth'
import { logsService } from '../services/logs'
import { alertsService } from '../services/alerts'
import { monitoringService } from '../services/monitoring'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function Dashboard() {
  const navigate = useNavigate()
  const [health, setHealth] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(false)
  const [stats, setStats] = useState({
    totalLogs: 0,
    totalAlerts: 0,
    openAlerts: 0,
    criticalAlerts: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [liveMetrics, setLiveMetrics] = useState(null)
  const [recentActivity, setRecentActivity] = useState({ logs: [], alerts: [] })
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    // Load user info
    const loadUser = async () => {
      setUserLoading(true)
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Failed to fetch user info:', error)
        // If token is invalid, logout
        authService.logout()
        navigate('/login')
      } finally {
        setUserLoading(false)
      }
    }

    loadUser()

    // Check health
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`)
        setHealth(response.data)
      } catch (error) {
        console.error('Failed to fetch health status:', error)
        setHealth({ status: 'error', message: 'Failed to connect to API' })
      } finally {
        setLoading(false)
      }
    }

    // Load statistics
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const [logsCount, alertsCount, openAlertsCount, criticalAlertsCount] = await Promise.all([
          logsService.getLogStats(),
          alertsService.getAlertStats(),
          alertsService.getAlertStats({ status: 'open' }),
          alertsService.getAlertStats({ severity: 'critical' }),
        ])
        
        setStats({
          totalLogs: logsCount.count || 0,
          totalAlerts: alertsCount.count || 0,
          openAlerts: openAlertsCount.count || 0,
          criticalAlerts: criticalAlertsCount.count || 0,
        })
      } catch (error) {
        console.error('Failed to load statistics:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    checkHealth()
    loadStats()
    
    // Setup WebSocket connection for live updates
    const token = localStorage.getItem('access_token')
    if (token) {
      const ws = monitoringService.createWebSocketConnection(
        token,
        (message) => {
          if (message.type === 'metrics') {
            setLiveMetrics(message.data)
            // Update stats from live metrics
            if (message.data) {
              setStats({
                totalLogs: message.data.logs?.counts?.total || 0,
                totalAlerts: message.data.alerts?.counts?.total || 0,
                openAlerts: message.data.alerts?.counts?.open || 0,
                criticalAlerts: message.data.alerts?.counts?.by_severity?.critical || 0,
              })
            }
          } else if (message.type === 'recent_activity') {
            setRecentActivity(message.data)
          } else if (message.type === 'new_log') {
            // Add new log to recent activity
            setRecentActivity(prev => ({
              ...prev,
              logs: [message.data, ...prev.logs.slice(0, 9)]
            }))
          } else if (message.type === 'new_alert') {
            // Add new alert to recent activity
            setRecentActivity(prev => ({
              ...prev,
              alerts: [message.data, ...prev.alerts.slice(0, 9)]
            }))
          }
        },
        (error) => {
          console.error('WebSocket error:', error)
          setWsConnected(false)
        },
        () => {
          setWsConnected(false)
        }
      )
      wsRef.current = ws
      setWsConnected(true)
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [navigate])

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a1a' }}>Dashboard</h1>
      
      {user && (
        <div style={{
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Welcome, {user.full_name}!</h2>
          <p style={{ color: '#666' }}><strong>Email:</strong> {user.email}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <Link to="/logs" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #2196F3',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem' }}>Total Logs</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
              {statsLoading ? '...' : stats.totalLogs}
            </p>
          </div>
        </Link>
        
        <Link to="/alerts" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #FF9800',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem' }}>Total Alerts</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
              {statsLoading ? '...' : stats.totalAlerts}
            </p>
          </div>
        </Link>
        
        <Link to="/alerts?status=open" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #F44336',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem' }}>Open Alerts</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#F44336' }}>
              {statsLoading ? '...' : stats.openAlerts}
            </p>
          </div>
        </Link>
        
        <Link to="/alerts?severity=critical" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #9C27B0',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem' }}>Critical Alerts</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#9C27B0' }}>
              {statsLoading ? '...' : stats.criticalAlerts}
            </p>
          </div>
        </Link>
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>System Status</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p><strong>Status:</strong> {health?.status || 'Unknown'}</p>
            <p><strong>Service:</strong> {health?.service || 'N/A'}</p>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#e8f4f8',
        borderRadius: '8px',
        borderLeft: '4px solid #2196F3'
      }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Phase 4: Live Monitoring ✅</h3>
        <p style={{ color: '#666' }}>
          Real-time WebSocket connections, live metrics endpoints, and live activity feed are now implemented.
        </p>
      </div>
    </div>
  )
}

export default Dashboard

