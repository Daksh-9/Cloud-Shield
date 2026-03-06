import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logsService } from '../services/logs'
import { authService } from '../services/auth'

function Logs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    source: '',
    severity: '',
    log_type: '',
  })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    loadLogs()
  }, [navigate])

  const loadLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await logsService.getLogs({ limit: 100, ...filters })
      setLogs(data)
    } catch (err) {
      setError('Failed to load logs. Please try again.')
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
    loadLogs()
  }

  const clearFilters = () => {
    setFilters({ source: '', severity: '', log_type: '' })
    setTimeout(loadLogs, 100)
  }

  const getSeverityColor = (severity) => {
    const colors = {
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
      critical: '#9C27B0',
    }
    return colors[severity.toLowerCase()] || '#666'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Security Logs</h1>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: 'var(--card-shadow)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Filters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Source
            </label>
            <input
              type="text"
              name="source"
              value={filters.source}
              onChange={handleFilterChange}
              placeholder="e.g., firewall, ids"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Severity
            </label>
            <select
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Log Type
            </label>
            <input
              type="text"
              name="log_type"
              value={filters.log_type}
              onChange={handleFilterChange}
              placeholder="e.g., access, attack"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
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

      {/* Logs List */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#3b1a1a',
          color: '#ffb4a9',
          borderRadius: '4px',
          border: '1px solid #b00020'
        }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: 'var(--card-shadow)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Log Entries ({logs.length})
        </h2>

        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No logs found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '1rem',
                  border: `2px solid ${getSeverityColor(log.severity)}`,
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  <div>
                    <strong style={{ color: '#333' }}>{log.message}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: getSeverityColor(log.severity),
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {log.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span><strong>Source:</strong> {log.source}</span>
                  <span><strong>Type:</strong> {log.log_type}</span>
                  <span><strong>Time:</strong> {formatDate(log.timestamp)}</span>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <strong>Metadata:</strong> {JSON.stringify(log.metadata)}
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

export default Logs

