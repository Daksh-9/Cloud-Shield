import { useState } from 'react'

function AlertConfig() {
  const [rules, setRules] = useState([
    { id: 1, name: 'SYN Flood Detect', type: 'DDoS', severity: 'Critical', status: true, desc: 'Packets > 50K/s for 30s' },
    { id: 2, name: 'UDP Amplification', type: 'DDoS', severity: 'High', status: true, desc: 'UDP > 30K/s, small request large response' },
    { id: 3, name: 'HTTP Slowloris', type: 'L7 Attack', severity: 'High', status: true, desc: 'Slow HTTP connections > 1000' },
    { id: 4, name: 'ICMP Flood', type: 'DDoS', severity: 'Medium', status: false, desc: 'ICMP > 10K/s' },
    { id: 5, name: 'Suricata Critical', type: 'IDS', severity: 'Critical', status: true, desc: 'Any critical Suricata signature' },
  ])

  const [notifications, setNotifications] = useState({
    email: true,
    slack: true,
    pagerduty: true,
    webhook: true,
    sms: false,
    siem: false
  })

  const toggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, status: !r.status } : r))
  }

  const getSeverityColor = (severity) => {
    switch(severity.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#ed6c02';
      case 'medium': return '#ff9800';
      default: return '#2e7d32';
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a' }}>Alert Configuration</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Manage detection rules and notification thresholds</p>
        </div>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>+</span> New Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Critical Triggers', value: 12, color: '#d32f2f' },
          { label: 'High Triggers', value: 34, color: '#ed6c02' },
          { label: 'Medium Triggers', value: 89, color: '#ff9800' },
          { label: 'Low Triggers', value: 156, color: '#2e7d32' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: `4px solid ${stat.color}` }}>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>{stat.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>Last 24 hours</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
        
        {/* Rules Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Active Alert Rules: {rules.filter(r => r.status).length}</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.5rem' }}>RULE NAME</th>
                <th style={{ padding: '1rem' }}>TYPE</th>
                <th style={{ padding: '1rem' }}>SEVERITY</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: rule.status ? '#2e7d32' : '#ccc' }}></span>
                      <span style={{ fontWeight: '500' }}>{rule.name}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1rem', marginTop: '0.25rem' }}>{rule.desc}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#666' }}>{rule.type}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '100px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: `${getSeverityColor(rule.severity)}15`,
                      color: getSeverityColor(rule.severity)
                    }}>
                      {rule.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: rule.status ? '#2e7d32' : '#666', fontWeight: '500', fontSize: '0.9rem' }}>
                      {rule.status ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                    <button 
                      onClick={() => toggleRule(rule.id)}
                      style={{ background: 'none', border: 'none', color: rule.status ? '#d32f2f' : '#2e7d32', cursor: 'pointer', marginRight: '0.5rem' }}
                    >
                      {rule.status ? 'Disable' : 'Enable'}
                    </button>
                    <button style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notifications Sidebar */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '1.5rem', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Notification Channels</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(notifications).map(([key, value]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', hover: { background: '#f5f5f5' } }}>
                <input 
                  type="checkbox" 
                  checked={value} 
                  onChange={() => setNotifications(prev => ({...prev, [key]: !prev[key]}))}
                  style={{ marginRight: '1rem', width: '16px', height: '16px', accentColor: '#2196F3' }}
                />
                <span style={{ textTransform: 'capitalize', flex: 1 }}>{key === 'siem' ? 'SIEM Export' : key}</span>
                <span style={{ fontSize: '1.2rem' }}>
                  {key === 'email' && '📧'}
                  {key === 'slack' && '💬'}
                  {key === 'pagerduty' && '📟'}
                  {key === 'webhook' && '🔗'}
                  {key === 'sms' && '📱'}
                  {key === 'siem' && '📊'}
                </span>
              </label>
            ))}
          </div>
          <button style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#333' }}>
            Configure Notifications
          </button>
        </div>

      </div>
    </div>
  )
}

export default AlertConfig