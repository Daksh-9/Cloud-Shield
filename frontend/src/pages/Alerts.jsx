import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertsService } from '../services/alerts';
import { authService } from '../services/auth';
import useSocket from '../hooks/useSocket';

function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    alert_type: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadAlerts();
  }, [navigate]);

  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    setExpandedAlertId(null);
    try {
      const data = await alertsService.getAlerts({ limit: 100, ...filters });
      setAlerts(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      setError('Failed to load alerts. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- WebSocket Subscriptions for Live Updates ---
  useSocket((event) => {
    if (!event || !event.type) return;

    if (event.type === 'ALERT_NEW' && event.payload) {
      const alert = event.payload;
      
      // Don't add if it doesn't match current filters
      if (filters.status && alert.status !== filters.status) return;
      if (filters.severity && alert.severity !== filters.severity) return;

      setAlerts((prev) => {
          if (prev.some(p => p.id === alert.id)) return prev;
          return [alert, ...prev].slice(0, 100); 
      });
    }
  });

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const applyFilters = (e) => {
    e.preventDefault();
    loadAlerts();
  };

  const clearFilters = () => {
    setFilters({ status: '', severity: '', alert_type: '' });
    setTimeout(() => {
      alertsService.getAlerts({ limit: 100 }).then(data => setAlerts(Array.isArray(data) ? data : data.items || []));
    }, 50);
  };

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      await alertsService.updateAlert(alertId, { status: newStatus });
      // Optimistically update UI
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId ? { ...alert, status: newStatus } : alert
        )
      );
      // Close the expanded panel after action
      if (newStatus === 'resolved' || newStatus === 'false_positive') {
         setExpandedAlertId(null);
      }
    } catch (err) {
      setError('Failed to update alert status.');
      console.error(err);
    }
  };

  const toggleRow = (id) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  // --- UI Helpers ---
  const getSeverityColor = (severity) => {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical') return '#F44336';
    if (sev === 'high') return '#E91E63';
    if (sev === 'medium') return '#FF9800';
    if (sev === 'low') return '#2196F3';
    return '#9E9E9E';
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let bg = 'rgba(158, 158, 158, 0.1)';
    let color = '#9E9E9E';
    
    if (s === 'open') { bg = 'rgba(244, 67, 54, 0.1)'; color = '#F44336'; }
    if (s === 'investigating') { bg = 'rgba(255, 152, 0, 0.1)'; color = '#FF9800'; }
    if (s === 'resolved') { bg = 'rgba(76, 175, 80, 0.1)'; color = '#4CAF50'; }
    
    return (
      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: bg, color: color, border: `1px solid ${color}50` }}>
        {s.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour12: false })}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🚨</span> Alert Management
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Triage and respond to security events</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={loadAlerts} disabled={loading} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? '↻ Loading...' : '↻ Refresh Data'}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <form onSubmit={applyFilters} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', border: '1px solid var(--border-color)' }}>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Severity</label>
          <select name="severity" value={filters.severity} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
            <option value="">Any Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Alert Type</label>
          <input type="text" name="alert_type" value={filters.alert_type} onChange={handleFilterChange} placeholder="e.g., suricata_alert, malware" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Search</button>
          <button type="button" onClick={clearFilters} style={{ padding: '0.6rem 1rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
        </div>
      </form>

      {error && <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '4px', border: '1px solid #F44336' }}>⚠️ {error}</div>}

      {/* Data Table */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>
            Showing {alerts.length} alerts
          </strong>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '180px' }}>Created At</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '100px' }}>Severity</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '120px' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '150px' }}>Type</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Alert Title</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading alerts...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No alerts found matching criteria.</td></tr>
              ) : (
                
                alerts.map((alert, idx) => {
                  const isExpanded = expandedAlertId === alert.id;
                  const sevColor = getSeverityColor(alert.severity);
                  
                  return (
                    <React.Fragment key={alert.id || idx}>
                      {/* Main Row */}
                      <tr onClick={() => toggleRow(alert.id)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(33, 150, 243, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)'), transition: 'background-color 0.2s', borderLeft: `4px solid ${sevColor}` }}>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(alert.created_at)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: sevColor, backgroundColor: `${sevColor}15`, border: `1px solid ${sevColor}50`, textTransform: 'uppercase' }}>
                            {alert.severity}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>{getStatusBadge(alert.status)}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{alert.alert_type}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{alert.title}</td>
                      </tr>
                      
                      {/* Expanded Triage Panel */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                          <td colSpan="5" style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                               
                               {/* Left Column: Details & JSON */}
                               <div>
                                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Detection Details</h3>
                                  <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>{alert.description}</p>
                                  
                                  {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                                    <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', overflowX: 'auto', fontSize: '0.85rem' }}>
                                      <div style={{ marginBottom: '0.5rem', color: '#569cd6', fontWeight: 'bold' }}>// Extracted Payload</div>
                                      <pre style={{ margin: 0 }}>{JSON.stringify(alert.metadata, null, 2)}</pre>
                                    </div>
                                  )}
                               </div>

                               {/* Right Column: Actions & Meta */}
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                  
                                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                      <strong style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)' }}>Triage Actions</strong>
                                      
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {alert.status !== 'investigating' && (
                                          <button onClick={() => handleStatusUpdate(alert.id, 'investigating')} style={{ padding: '0.6rem', backgroundColor: 'transparent', color: '#FF9800', border: '1px solid #FF9800', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🔍 Mark as Investigating</button>
                                        )}
                                        {alert.status !== 'resolved' && (
                                          <button onClick={() => handleStatusUpdate(alert.id, 'resolved')} style={{ padding: '0.6rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Resolve Alert</button>
                                        )}
                                        {alert.status !== 'false_positive' && (
                                          <button onClick={() => handleStatusUpdate(alert.id, 'false_positive')} style={{ padding: '0.6rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>Ignore (False Positive)</button>
                                        )}
                                      </div>
                                  </div>

                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                      <div style={{ marginBottom: '0.25rem' }}><strong>Source:</strong> {alert.source || 'Unknown'}</div>
                                      {/* 🟢 FIX: Display the extracted IPs in the UI */}
                                      <div style={{ marginBottom: '0.25rem' }}>
                                        <strong>Attacker IP:</strong> <span style={{color: '#F44336'}}>{alert.src_ip || alert.metadata?.src_ip || 'N/A'}</span>
                                      </div>
                                      <div style={{ marginBottom: '0.25rem' }}>
                                        <strong>Target IP:</strong> <span style={{color: '#4CAF50'}}>{alert.dest_ip || alert.metadata?.dest_ip || 'N/A'}</span>
                                      </div>
                                      <div style={{ marginBottom: '0.25rem', marginTop: '0.5rem' }}><strong>Alert ID:</strong> {alert.id}</div>
                                  </div>

                        

                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                      <div style={{ marginBottom: '0.25rem' }}><strong>Source:</strong> {alert.source || 'Unknown'}</div>
                                      <div style={{ marginBottom: '0.25rem' }}><strong>Alert ID:</strong> {alert.id}</div>
                                  </div>

                               </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Alerts;