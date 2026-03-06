import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringService } from '../services/monitoring';
import useSocket from '../hooks/useSocket';
// ... other imports

const Dashboard = () => {
  const navigate = useNavigate();
  // ... existing state ...
  const [alertStats, setAlertStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  // --- NEW: Load Distribution ---
  useEffect(() => {
    // Simulated fetch for dashboard components (or use api.get('/alerts/stats/distribution'))
    // For this example, we mock the stats structure based on the new backend requirements
    setAlertStats({
      critical: 5,
      high: 12,
      medium: 45,
      low: 20,
    });
  }, []);

  // WebSocket subscription for live LOG_UPDATE and ALERT_NEW events
  useSocket((event) => {
    if (!event || !event.type) return;

    if (event.type === 'ALERT_NEW' && event.payload) {
      const alert = event.payload;

      // Update severity stats
      setAlertStats((prev) => {
        const sevKey = (alert.severity || '').toLowerCase();
        if (!['critical', 'high', 'medium', 'low'].includes(sevKey)) {
          return prev;
        }
        return {
          ...prev,
          [sevKey]: (prev[sevKey] || 0) + 1,
        };
      });

      // Prepend to recent alerts list
      setRecentAlerts((prev) => [
        {
          id: alert.id,
          time: alert.created_at || new Date().toISOString(),
          title: alert.title,
          severity: alert.severity,
          status: alert.status || 'Open',
        },
        ...prev,
      ].slice(0, 20));
    }

    if (event.type === 'LOG_UPDATE' && event.payload) {
      const log = event.payload;
      setSystemLogs((prev) => [
        `${log.severity || 'info'}: ${log.message}`,
        ...prev,
      ].slice(0, 20));
    }
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Detection Dashboard</h1>

      {/* --- NEW: Severity Stats Row --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Critical', count: alertStats.critical, color: '#d32f2f' },
          { label: 'High', count: alertStats.high, color: '#f57c00' },
          { label: 'Medium', count: alertStats.medium, color: '#fbc02d' },
          { label: 'Low', count: alertStats.low, color: '#388e3c' },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>{stat.label} Severity</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* --- NEW: Filters & Recent Alerts --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
        
        {/* Recent Alerts Table */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Recent Alerts</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <option>All Rules</option>
                <option>SQL Injection</option>
                <option>DDoS Attempt</option>
              </select>
              <input type="date" style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Time</th>
                <th style={{ padding: '0.75rem' }}>Rule Name</th>
                <th style={{ padding: '0.75rem' }}>Severity</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{new Date(row.time).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>{row.title}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', color: '#fff',
                      backgroundColor: row.severity === 'Critical' ? '#d32f2f' : row.severity === 'High' ? '#f57c00' : '#fbc02d' 
                    }}>
                      {row.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions / Logs */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>System Logs</h3>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {systemLogs.length === 0 && (
              <>
                <div>ℹ️ Waiting for live log events…</div>
              </>
            )}
            {systemLogs.map((entry, idx) => (
              <div key={idx}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;