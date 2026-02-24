import React, { useState } from 'react';

function AlertManagement() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      severity: 'Critical',
      title: 'SYN Flood Detected',
      timestamp: '14:23:45',
      source: '203.0.113.45',
      target: '10.0.1.100:80',
      details: { 'Rate': '87.3K packets/s', 'Threshold': '50K', 'Duration': '2m 34s' },
      rule: 'SYN Flood Detect',
      confidence: 98.7,
      status: 'unresolved'
    },
    {
      id: 2,
      severity: 'High',
      title: 'UDP Amplification Attack',
      timestamp: '14:20:12',
      source: 'Multiple (45 IPs)',
      target: '10.0.2.50:53',
      details: { 'Amplification Factor': '58x', 'Duration': '8m 12s' },
      rule: 'UDP Amplification',
      confidence: 94.2,
      status: 'acknowledged',
      ackBy: 'analyst_01',
      ackTime: '2m ago'
    },
    {
      id: 3,
      severity: 'Medium',
      title: 'Unusual Traffic Pattern',
      timestamp: '14:15:33',
      source: '198.51.100.23',
      target: 'Internal Subnet',
      details: { 'ML Detection': 'Anomalous flow behavior', 'Deviation': '3.2 σ from baseline' },
      rule: 'ML Detection',
      confidence: 85.0,
      status: 'unresolved'
    }
  ]);

  // --- Action Handlers ---

  const handleAcknowledge = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id 
        ? { ...alert, status: 'acknowledged', ackBy: 'admin_user', ackTime: 'Just now' } 
        : alert
    ));
  };

  const handleResolve = (id) => {
    // Marks as resolved. In a real app, this might send a PUT request to the backend
    // and we filter out 'resolved' alerts from the active view.
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: 'resolved' } : alert
    ));
  };

  const handleBlockIP = (ip) => {
    // Simulates calling the backend to add the IP to a firewall blocklist
    window.alert(`Security Action: IP ${ip} has been successfully added to the blocklist.`);
  };

  const handleMute = (id) => {
    window.alert(`Alert #${id} has been muted for 1 hour. Notifications suspended.`);
  };

  const handleMarkAllRead = () => {
    setAlerts(alerts.map(alert => 
      alert.status === 'unresolved' 
        ? { ...alert, status: 'acknowledged', ackBy: 'admin_user', ackTime: 'Just now' } 
        : alert
    ));
  };

  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `cloud_shield_alerts_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  };

  // --- Filtering Logic ---

  // Only show alerts that haven't been resolved
  const activeAlerts = alerts.filter(a => a.status !== 'resolved');
  
  // Apply the selected severity filter
  const displayedAlerts = activeAlerts.filter(a => 
    activeFilter === 'All' ? true : a.severity === activeFilter
  );

  const unresolvedCount = activeAlerts.filter(a => a.status === 'unresolved').length;

  const getSeverityStyle = (severity) => {
    const styles = {
      Critical: { color: '#d32f2f', bg: '#ffebee', icon: '🔴' },
      High: { color: '#ed6c02', bg: '#fff3e0', icon: '🟠' },
      Medium: { color: '#ef6c00', bg: '#fff8e1', icon: '🟡' },
      Low: { color: '#2e7d32', bg: '#e8f5e9', icon: '🟢' }
    };
    return styles[severity] || styles.Low;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            Active Alerts 
            {unresolvedCount > 0 && (
              <span style={{ fontSize: '0.9rem', backgroundColor: '#d32f2f', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px' }}>
                🔔 {unresolvedCount} Unresolved
              </span>
            )}
          </h1>
        </div>
        
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#fff', padding: '0.25rem', borderRadius: '6px', border: '1px solid #ddd' }}>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: activeFilter === filter ? '#333' : 'transparent',
                color: activeFilter === filter ? '#fff' : '#666',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {displayedAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
            No active alerts matching the selected filter.
          </div>
        ) : (
          displayedAlerts.map(alert => {
            const style = getSeverityStyle(alert.severity);
            return (
              <div key={alert.id} style={{ 
                backgroundColor: '#fff', 
                borderRadius: '8px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
                overflow: 'hidden',
                borderLeft: `5px solid ${style.color}`,
                transition: 'transform 0.2s ease'
              }}>
                {/* Alert Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
                    <span style={{ fontWeight: 'bold', color: style.color }}>{alert.severity.toUpperCase()}</span>
                    <span style={{ color: '#ccc' }}>|</span>
                    <span style={{ fontWeight: '600', color: '#333' }}>{alert.title}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'monospace' }}>{alert.timestamp}</div>
                </div>

                {/* Alert Body */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Left Column: Network Info */}
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Source</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', backgroundColor: '#eee', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{alert.source}</span>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Target</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{alert.target}</span>
                      </div>
                      
                      {alert.status === 'acknowledged' && (
                         <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '0.9rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <span>✓</span> Acknowledged by <strong>{alert.ackBy}</strong> ({alert.ackTime})
                         </div>
                      )}
                    </div>

                    {/* Right Column: Attack Details */}
                    <div>
                      {Object.entries(alert.details).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                          <span style={{ color: '#666' }}>{key}:</span>
                          <span style={{ fontWeight: '500' }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>Matched Rule:</span>
                        <span style={{ color: '#2196F3', fontWeight: '500' }}>{alert.rule}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                         <span style={{ color: '#666' }}>Confidence:</span>
                         <span style={{ fontWeight: 'bold', color: alert.confidence > 90 ? '#2e7d32' : '#ff9800' }}>{alert.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.75rem' }}>
                    {alert.status === 'unresolved' && (
                      <button 
                        onClick={() => handleAcknowledge(alert.id)}
                        style={{ padding: '0.5rem 1rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}>
                        Acknowledge
                      </button>
                    )}
                    <button 
                      onClick={() => handleBlockIP(alert.source)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                      Block IP
                    </button>
                    <button 
                      onClick={() => handleMute(alert.id)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                      Mute 1h
                    </button>
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold' }}>
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer Actions */}
      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        <button 
          onClick={handleMarkAllRead}
          style={{ color: '#2196F3', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}>
          Mark All Unresolved as Read
        </button>
        <button 
          onClick={handleExportReport}
          style={{ color: '#2196F3', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}>
          Export Alerts Report (JSON)
        </button>
      </div>

    </div>
  );
}

export default AlertManagement;