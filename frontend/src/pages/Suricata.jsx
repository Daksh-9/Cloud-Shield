import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { suricataService } from '../services/suricata'
import { authService } from '../services/auth'

function Suricata() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [rules, setRules] = useState([])
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [newRule, setNewRule] = useState({ name: '', rule_content: '', description: '', enabled: true })
  const [newConfig, setNewConfig] = useState({ config_name: '', config_content: '', description: '' })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    loadData()
  }, [navigate, activeTab])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'events') {
        const data = await suricataService.getEvents({ limit: 50 })
        setEvents(data)
      } else if (activeTab === 'rules') {
        const data = await suricataService.getRules()
        setRules(data)
      } else if (activeTab === 'configs') {
        const data = await suricataService.getConfigs()
        setConfigs(data)
      }
    } catch (err) {
      setError('Failed to load data. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await suricataService.createRule(newRule)
      setSuccess('Rule created successfully!')
      setNewRule({ name: '', rule_content: '', description: '', enabled: true })
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create rule.')
    }
  }

  const handleCreateConfig = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await suricataService.createConfig(newConfig)
      setSuccess('Config created successfully!')
      setNewConfig({ config_name: '', config_content: '', description: '' })
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create config.')
    }
  }

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      await suricataService.updateRule(ruleId, { enabled: !enabled })
      loadData()
    } catch (err) {
      setError('Failed to update rule.')
    }
  }

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return
    
    try {
      await suricataService.deleteRule(ruleId)
      loadData()
    } catch (err) {
      setError('Failed to delete rule.')
    }
  }

  const handleReload = async () => {
    setError('')
    setSuccess('')
    try {
      const result = await suricataService.reload()
      setSuccess(result.message || 'Suricata reload triggered successfully!')
    } catch (err) {
      setError('Failed to reload Suricata.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#1a1a1a' }}>Suricata Management</h1>
        <button
          onClick={handleReload}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Reload Suricata
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'events' ? '#2196F3' : 'transparent',
            color: activeTab === 'events' ? '#fff' : '#666',
            border: 'none',
            borderBottom: activeTab === 'events' ? '2px solid #2196F3' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px'
          }}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'rules' ? '#2196F3' : 'transparent',
            color: activeTab === 'rules' ? '#fff' : '#666',
            border: 'none',
            borderBottom: activeTab === 'rules' ? '2px solid #2196F3' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px'
          }}
        >
          Rules
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'configs' ? '#2196F3' : 'transparent',
            color: activeTab === 'configs' ? '#fff' : '#666',
            border: 'none',
            borderBottom: activeTab === 'configs' ? '2px solid #2196F3' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px'
          }}
        >
          Configs
        </button>
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

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div style={{
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Suricata Events ({events.length})</h2>
          
          {loading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p style={{ color: '#666' }}>No events found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{event.event_type}</strong>
                    <span style={{ color: '#666', fontSize: '0.875rem' }}>{formatDate(event.timestamp)}</span>
                  </div>
                  <pre style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#fff',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {JSON.stringify(event.raw_event, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          {/* Create Rule Form */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Create New Rule</h2>
            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Rule Content</label>
                <textarea
                  value={newRule.rule_content}
                  onChange={(e) => setNewRule({ ...newRule, rule_content: e.target.value })}
                  required
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Description</label>
                <input
                  type="text"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={newRule.enabled}
                    onChange={(e) => setNewRule({ ...newRule, enabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create Rule
              </button>
            </form>
          </div>

          {/* Rules List */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Suricata Rules ({rules.length})</h2>
            
            {loading ? (
              <p>Loading rules...</p>
            ) : rules.length === 0 ? (
              <p style={{ color: '#666' }}>No rules found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong>{rule.name}</strong>
                        {rule.description && <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.875rem' }}>{rule.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: rule.enabled ? '#4CAF50' : '#9E9E9E',
                          color: '#fff',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <pre style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#fff',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      marginBottom: '0.5rem'
                    }}>
                      {rule.rule_content}
                    </pre>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.enabled)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: rule.enabled ? '#FF9800' : '#4CAF50',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {rule.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
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
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configs Tab */}
      {activeTab === 'configs' && (
        <div>
          {/* Create Config Form */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Create New Config</h2>
            <form onSubmit={handleCreateConfig}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Config Name</label>
                <input
                  type="text"
                  value={newConfig.config_name}
                  onChange={(e) => setNewConfig({ ...newConfig, config_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Config Content</label>
                <textarea
                  value={newConfig.config_content}
                  onChange={(e) => setNewConfig({ ...newConfig, config_content: e.target.value })}
                  required
                  rows={10}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Description</label>
                <input
                  type="text"
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create Config
              </button>
            </form>
          </div>

          {/* Configs List */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Suricata Configs ({configs.length})</h2>
            
            {loading ? (
              <p>Loading configs...</p>
            ) : configs.length === 0 ? (
              <p style={{ color: '#666' }}>No configs found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {configs.map((config) => (
                  <div
                    key={config.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{config.config_name}</strong>
                      {config.description && <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.875rem' }}>{config.description}</p>}
                    </div>
                    <pre style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#fff',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {config.config_content}
                    </pre>
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

export default Suricata

