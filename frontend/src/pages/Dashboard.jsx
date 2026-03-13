import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringService } from '../services/monitoring';
import useSocket from '../hooks/useSocket';

const Dashboard = () => {
  const navigate = useNavigate();
  const [alertStats, setAlertStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: Load Distribution ---
  useEffect(() => {
    // Simulated fetch for dashboard components (or use api.get('/alerts/stats/distribution'))
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Mock data structure based on the new backend requirements
        setAlertStats({
          critical: 5,
          high: 12,
          medium: 45,
          low: 20,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
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
          id: alert.id || Date.now(),
          time: alert.created_at || new Date().toISOString(),
          title: alert.title || alert.message || 'Unknown Alert',
          severity: alert.severity || 'Info',
          status: alert.status || 'Open',
        },
        ...prev,
      ].slice(0, 20));
    }

    if (event.type === 'LOG_UPDATE' && event.payload) {
      const log = event.payload;
      setSystemLogs((prev) => [
        {
            id: log.id || Date.now(),
            severity: log.severity || log.event_type || 'info',
            message: log.message || `${log.src_ip} -> ${log.dest_ip} (${log.proto})`,
            time: log.timestamp || new Date().toISOString()
        },
        ...prev,
      ].slice(0, 20)); // Keep last 20 logs
    }
  });

  const getSeverityColor = (severity) => {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical') return '#F44336'; // Red
    if (sev === 'high' || sev === 'error') return '#FF9800'; // Orange
    if (sev === 'medium' || sev === 'warning') return '#FFC107'; // Yellow
    if (sev === 'low' || sev === 'info') return '#2196F3'; // Blue
    return '#9E9E9E'; // Grey default
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Detection Dashboard</h1>

      {/* --- NEW: Severity Stats Row --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Critical', count: alertStats.critical, color: '#F44336' },
          { label: 'High', count: alertStats.high, color: '#FF9800' },
          { label: 'Medium', count: alertStats.medium, color: '#FFC107' },
          { label: 'Low', count: alertStats.low, color: '#2196F3' },
        ].map((stat) => (
          <div key={stat.label} style={{ 
            padding: '1.5rem', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '8px', 
            boxShadow: 'var(--card-shadow)', 
            borderTop: `4px solid ${stat.color}`,
            color: 'var(--text-primary)'
          }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              {stat.label} Alerts
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {loading ? '-' : stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* --- NEW: Filters & Recent Alerts --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Recent Alerts Table */}
        <div style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            boxShadow: 'var(--card-shadow)',
            gridColumn: 'span 2'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Recent Alerts</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select style={{ 
                  padding: '0.5rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
              }}>
                <option>All Rules</option>
                <option>SQL Injection</option>
                <option>DDoS Attempt</option>
              </select>
              <input type="date" style={{ 
                  padding: '0.5rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
              }} />
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Time</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Rule Name</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Severity</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No recent alerts found.
                    </td>
                  </tr>
                ) : (
                  recentAlerts.map((row, i) => (
                    <tr key={row.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(row.time).toLocaleTimeString()}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{row.title}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor: getSeverityColor(row.severity)
                        }}>
                          {row.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Logs */}
        <div style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>System Logs</h3>
          <div style={{ 
              flex: 1,
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              overflowY: 'auto',
              maxHeight: '400px'
          }}>
            {systemLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <div>📡</div>
                <div>Waiting for live log events…</div>
              </div>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            backgroundColor: getSeverityColor(log.severity),
                            color: '#fff',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>
                            {log.severity}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.time).toLocaleTimeString()}
                        </span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {log.message}
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;