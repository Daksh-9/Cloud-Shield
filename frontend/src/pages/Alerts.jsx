import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alertsService } from '../services/alerts'
import { authService } from '../services/auth'

function Alerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    alert_type: '',
  })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    loadAlerts()
  }, [navigate])

  const loadAlerts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await alertsService.getAlerts({ limit: 100, ...filters })
      setAlerts(data)
    } catch (err) {
      setError('Failed to load alerts. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const applyFilters = () => {
    loadAlerts()
  }

  const clearFilters = () => {
    setFilters({ status: '', severity: '', alert_type: '' })
    setTimeout(loadAlerts, 100)
  }

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      await alertsService.updateAlert(alertId, { status: newStatus })
      loadAlerts()
    } catch (err) {
      setError('Failed to update alert status.')
      console.error(err)
    }
  }

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#9C27B0',
    }
    return colors[severity.toLowerCase()] || '#666'
  }

  const getStatusColor = (status) => {
    const colors = {
      open: '#F44336',
      investigating: '#FF9800',
      resolved: '#4CAF50',
      false_positive: '#9E9E9E',
    }
    return colors[status.toLowerCase()] || '#666'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a1a' }}>Security Alerts</h1>

      {/* Filters */}
      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333', fontSize: '1.2rem' }}>Filters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              Severity
            </label>
            <select
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              Alert Type
            </label>
            <input
              type="text"
              name="alert_type"
              value={filters.alert_type}
              onChange={handleFilterChange}
              placeholder="e.g., intrusion, malware"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={applyFilters}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Alerts List */}
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

      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>
          Alert List ({alerts.length})
        </h2>

        {loading ? (
          <p>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p style={{ color: '#666' }}>No alerts found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '1.5rem',
                  border: `2px solid ${getSeverityColor(alert.severity)}`,
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333' }}>{alert.title}</h3>
                    <p style={{ margin: 0, color: '#666', marginBottom: '0.5rem' }}>{alert.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: getSeverityColor(alert.severity),
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: getStatusColor(alert.status),
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span><strong>Type:</strong> {alert.alert_type}</span>
                  {alert.source && <span><strong>Source:</strong> {alert.source}</span>}
                  <span><strong>Created:</strong> {formatDate(alert.created_at)}</span>
                </div>
                {alert.notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px', fontSize: '0.875rem' }}>
                    <strong>Notes:</strong> {alert.notes}
                  </div>
                )}
                {alert.status === 'open' && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleStatusUpdate(alert.id, 'investigating')}
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
                      Mark Investigating
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Alerts

