import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mlService } from '../services/ml'
import { authService } from '../services/auth'

function MLDetection() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inference')
  const [detections, setDetections] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Inference form state
  const [inferenceData, setInferenceData] = useState({
    data: JSON.stringify({ message: 'Sample log entry', severity: 'warning' }, null, 2),
    modelName: '',
    autoCreateAlert: false
  })
  const [inferenceResult, setInferenceResult] = useState(null)

  // Filters
  const [filters, setFilters] = useState({
    detection_type: '',
    model_name: '',
    min_confidence: ''
  })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    if (activeTab === 'detections') {
      loadDetections()
    } else if (activeTab === 'inference') {
      loadModels()
    }
  }, [navigate, activeTab])

  const loadDetections = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await mlService.getDetections({ limit: 100, ...filters })
      setDetections(data)
    } catch (err) {
      setError('Failed to load detections. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadModels = async () => {
    try {
      const data = await mlService.listModels()
      setModels(data.models || [])
      if (data.default_model && !inferenceData.modelName) {
        setInferenceData(prev => ({ ...prev, modelName: data.default_model }))
      }
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }

  const handleRunInference = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setInferenceResult(null)

    try {
      let data
      try {
        data = JSON.parse(inferenceData.data)
      } catch (e) {
        throw new Error('Invalid JSON data')
      }

      const result = await mlService.runInference(data, {
        modelName: inferenceData.modelName || undefined,
        autoCreateAlert: inferenceData.autoCreateAlert
      })

      setInferenceResult(result)
      setSuccess('Inference completed successfully!')
      
      // Reload detections if on that tab
      if (activeTab === 'detections') {
        loadDetections()
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run inference.')
      console.error(err)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const applyFilters = () => {
    loadDetections()
  }

  const clearFilters = () => {
    setFilters({ detection_type: '', model_name: '', min_confidence: '' })
    setTimeout(loadDetections, 100)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#F44336' // Red for high confidence
    if (confidence >= 0.6) return '#FF9800' // Orange for medium
    return '#4CAF50' // Green for low
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '2rem' }}>ML Detection</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('inference')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'inference' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'inference' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'inference' ? '2px solid var(--accent-color)' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px'
          }}
        >
          Run Inference
        </button>
        <button
          onClick={() => setActiveTab('detections')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'detections' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'detections' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'detections' ? '2px solid var(--accent-color)' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px'
          }}
        >
          Detection History
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '4px', border: '1px solid #F44336' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '4px', border: '1px solid #4CAF50' }}>
          {success}
        </div>
      )}

      {/* Inference Tab */}
      {activeTab === 'inference' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Run ML Inference</h2>
          
          <form onSubmit={handleRunInference}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Input Data (JSON)
              </label>
              <textarea
                value={inferenceData.data}
                onChange={(e) => setInferenceData({ ...inferenceData, data: e.target.value })}
                required
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Model Name (optional)
              </label>
              <select
                value={inferenceData.modelName}
                onChange={(e) => setInferenceData({ ...inferenceData, modelName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Use Default Model</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={inferenceData.autoCreateAlert}
                  onChange={(e) => setInferenceData({ ...inferenceData, autoCreateAlert: e.target.checked })}
                />
                <span>Automatically create alert if threat detected</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? 'var(--text-secondary)' : 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Running...' : 'Run Inference'}
            </button>
          </form>

          {inferenceResult && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '4px',
              border: `2px solid ${getConfidenceColor(inferenceResult.confidence)}`
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Inference Result</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <strong>Prediction:</strong> {inferenceResult.prediction}
                </div>
                <div>
                  <strong>Confidence:</strong> {(inferenceResult.confidence * 100).toFixed(2)}%
                </div>
                <div>
                  <strong>Detection Type:</strong> {inferenceResult.detection_type}
                </div>
                <div>
                  <strong>Model:</strong> {inferenceResult.model_name}
                </div>
              </div>
              {inferenceResult.alert_id && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  borderRadius: '4px',
                  marginTop: '1rem',
                  border: '1px solid #FF9800',
                  color: '#FF9800'
                }}>
                  <strong>Alert Created:</strong> Alert ID {inferenceResult.alert_id}
                </div>
              )}
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Features Used</summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  border: '1px solid var(--border-color)'
                }}>
                  {JSON.stringify(inferenceResult.features, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Detections Tab */}
      {activeTab === 'detections' && (
        <div>
          {/* Filters */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: 'var(--card-shadow)',
            marginBottom: '2rem',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Filters</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Detection Type
                </label>
                <select
                  name="detection_type"
                  value={filters.detection_type}
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
                  <option value="anomaly">Anomaly</option>
                  <option value="intrusion">Intrusion</option>
                  <option value="malware">Malware</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Model Name
                </label>
                <input
                  type="text"
                  name="model_name"
                  value={filters.model_name}
                  onChange={handleFilterChange}
                  placeholder="e.g., threat_detection"
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
                  Min Confidence
                </label>
                <input
                  type="number"
                  name="min_confidence"
                  value={filters.min_confidence}
                  onChange={handleFilterChange}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.0 - 1.0"
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
                  backgroundColor: 'var(--accent-color)',
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
                  backgroundColor: 'var(--text-secondary)',
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

          {/* Detections List */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '1rem' }}>
              Detection History ({detections.length})
            </h2>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading detections...</p>
            ) : detections.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No detections found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {detections.map((detection) => (
                  <div
                    key={detection.id}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${getConfidenceColor(detection.confidence)}`,
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ fontSize: '1.1rem' }}>{detection.prediction}</strong>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <span><strong style={{ color: 'var(--text-primary)' }}>Type:</strong> {detection.detection_type}</span>
                          <span><strong style={{ color: 'var(--text-primary)' }}>Model:</strong> {detection.model_name}</span>
                          <span><strong style={{ color: 'var(--text-primary)' }}>Time:</strong> {formatDate(detection.created_at)}</span>
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: getConfidenceColor(detection.confidence),
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {(detection.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {(detection.related_log_id || detection.related_alert_id) && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {detection.related_log_id && <span>Log ID: {detection.related_log_id} </span>}
                        {detection.related_alert_id && <span>Alert ID: {detection.related_alert_id}</span>}
                      </div>
                    )}
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.875rem' }}>View Features</summary>
                      <pre style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        border: '1px solid var(--border-color)'
                      }}>
                        {JSON.stringify(detection.features, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MLDetection