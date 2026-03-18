import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logsService } from '../services/logs';
import { authService } from '../services/auth';
import useSocket from '../hooks/useSocket';

function Logs() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('system'); // 'system' or 'traffic'
  const [logs, setLogs] = useState([]);
  const [trafficLogs, setTrafficLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  const [filters, setFilters] = useState({
    source: '',
    severity: '',
    log_type: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadLogs();
  }, [navigate, viewMode]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    setExpandedLogId(null); 
    
    try {
      if (viewMode === 'system') {
        const data = await logsService.getLogs({ limit: 100, ...filters });
        setLogs(Array.isArray(data) ? data : (data?.items || []));
      } else {
        const data = await logsService.getSuricataEvents({ limit: 100, event_type: filters.log_type || '' });
        setTrafficLogs(Array.isArray(data) ? data : (data?.items || []));
      }
    } catch (err) {
      setError('Failed to load logs. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- WebSocket Subscriptions for Live Updates ---
  useSocket((event) => {
    if (!event || !event.type) return;

    if (event.type === 'LOG_UPDATE' && event.payload) {
      const log = event.payload;

      // Check if this is a Suricata Event (it will contain raw_event)
      if (log.raw_event) {
          // It's a traffic log!
          if (viewMode === 'traffic') {
              setTrafficLogs((prev) => {
                  // Prevent duplicates if REST API and WS race
                  if (prev.some(p => p.id === log.id)) return prev;
                  return [log, ...prev].slice(0, 100); // Keep last 100
              });
          }
      } else {
          // It's a standard system log!
          if (viewMode === 'system') {
              setLogs((prev) => {
                  const standardLog = {
                    id: log.id,
                    severity: log.severity || 'info',
                    source: log.source || 'system',
                    log_type: log.log_type || 'event',
                    message: log.message,
                    timestamp: log.timestamp,
                    metadata: log.metadata || {}
                  };
                  if (prev.some(p => p.id === standardLog.id)) return prev;
                  return [standardLog, ...prev].slice(0, 100); // Keep last 100
              });
          }
      }
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
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({ source: '', severity: '', log_type: '' });
    setTimeout(() => {
        logsService.getLogs({ limit: 100 }).then(data => setLogs(Array.isArray(data) ? data : data.items || []));
        logsService.getSuricataEvents({ limit: 100 }).then(data => setTrafficLogs(Array.isArray(data) ? data : data.items || []));
    }, 50);
  };

  const toggleRow = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getSeverityColor = (severity) => {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical' || sev === 'alert') return '#F44336';
    if (sev === 'error' || sev === 'high') return '#E91E63';
    if (sev === 'warning' || sev === 'medium') return '#FF9800';
    if (sev === 'info' || sev === 'low') return '#2196F3';
    return '#9E9E9E';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour12: false })}`;
  };

  // --- EXTRACT NET INFO (SMART PACKET/BYTE FALLBACK) ---
  const extractNetInfo = (raw_event) => {
    if (!raw_event) return { src: '-', dest: '-', proto: '-', pkts: '-' };
    
    let traffic = '-';
    
    if (raw_event.flow) {
      // 1. Try to find Packet counts first
      const pktsToServer = raw_event.flow.pkts_toserver || 0;
      const pktsToClient = raw_event.flow.pkts_toclient || 0;
      
      if (pktsToServer > 0 || pktsToClient > 0) {
        traffic = `${pktsToServer + pktsToClient} pkts`;
      } else if (raw_event.flow.pkts) {
        traffic = `${raw_event.flow.pkts} pkts`;
      } 
      // 2. Fallback to Byte counts
      else {
        const bytesToServer = raw_event.flow.bytes_toserver || 0;
        const bytesToClient = raw_event.flow.bytes_toclient || 0;
        const totalBytes = bytesToServer + bytesToClient;
        
        if (totalBytes > 0) {
          if (totalBytes > 1048576) {
            traffic = `${(totalBytes / 1048576).toFixed(1)} MB`;
          } else if (totalBytes > 1024) {
            traffic = `${(totalBytes / 1024).toFixed(1)} KB`;
          } else {
            traffic = `${totalBytes} B`;
          }
        }
      }
    }

    return {
      src: raw_event.src_ip ? `${raw_event.src_ip}:${raw_event.src_port || ''}` : '-',
      dest: raw_event.dest_ip ? `${raw_event.dest_ip}:${raw_event.dest_port || ''}` : '-',
      proto: raw_event.proto || '-',
      pkts: traffic 
    };
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>📡</span> Central Log Viewer
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Query and analyze system and traffic events</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={loadLogs} disabled={loading} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? '↻ Loading...' : '↻ Refresh Data'}
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setViewMode('system')}
          style={{ padding: '0.75rem 2rem', backgroundColor: viewMode === 'system' ? 'var(--accent-color)' : 'transparent', color: viewMode === 'system' ? '#fff' : 'var(--text-secondary)', border: 'none', borderBottom: viewMode === 'system' ? '3px solid #1976D2' : '3px solid transparent', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s' }}
        >
          System Logs
        </button>
        <button
          onClick={() => setViewMode('traffic')}
          style={{ padding: '0.75rem 2rem', backgroundColor: viewMode === 'traffic' ? 'var(--accent-color)' : 'transparent', color: viewMode === 'traffic' ? '#fff' : 'var(--text-secondary)', border: 'none', borderBottom: viewMode === 'traffic' ? '3px solid #1976D2' : '3px solid transparent', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s' }}
        >
          Suricata Traffic (EVE)
        </button>
      </div>

      {/* Filters Bar */}
      <form onSubmit={applyFilters} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', border: '1px solid var(--border-color)' }}>
        
        {viewMode === 'system' && (
          <>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Source Service</label>
              <input type="text" name="source" value={filters.source} onChange={handleFilterChange} placeholder="e.g., auth, ml_engine" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Severity</label>
              <select name="severity" value={filters.severity} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="">Any Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </>
        )}

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {viewMode === 'traffic' ? 'EVE Event Type' : 'Log Type'}
          </label>
          <input type="text" name="log_type" value={filters.log_type} onChange={handleFilterChange} placeholder={viewMode === 'traffic' ? 'e.g., alert, dns, http' : 'e.g., access, attack'} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
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
            Showing {viewMode === 'system' ? logs.length : trafficLogs.length} events
          </strong>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {viewMode === 'system' ? (
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '180px' }}>Timestamp</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '100px' }}>Severity</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '150px' }}>Source</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '150px' }}>Type</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Message</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '180px' }}>Timestamp</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '120px' }}>Event Type</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '80px' }}>Proto</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '120px' }}>Traffic Size</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Source IP</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Destination IP</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={viewMode === 'system' ? "5" : "6"} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Gathering logs...</td></tr>
              ) : viewMode === 'system' && logs.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No system logs found matching criteria.</td></tr>
              ) : viewMode === 'traffic' && trafficLogs.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No traffic events found matching criteria.</td></tr>
              ) : (
                
                (viewMode === 'system' ? logs : trafficLogs).map((log, idx) => {
                  const isExpanded = expandedLogId === log.id;
                  
                  if (viewMode === 'system') {
                    const sevColor = getSeverityColor(log.severity);
                    return (
                      <React.Fragment key={log.id || idx}>
                        <tr onClick={() => toggleRow(log.id)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(33, 150, 243, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)'), transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                          <td style={{ padding: '1rem' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: sevColor, backgroundColor: `${sevColor}15`, border: `1px solid ${sevColor}50`, textTransform: 'uppercase' }}>{log.severity || 'INFO'}</span></td>
                          <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{log.source}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{log.log_type}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{log.message}</td>
                        </tr>
                        {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                          <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <td colSpan="5" style={{ padding: '0' }}>
                              <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', color: '#d4d4d4', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', overflowX: 'auto', fontSize: '0.85rem' }}>
                                <div style={{ marginBottom: '0.5rem', color: '#569cd6', fontWeight: 'bold' }}>// Metadata Payload</div>
                                <pre style={{ margin: 0 }}>{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  } else {
                    const netInfo = extractNetInfo(log.raw_event);
                    return (
                      <React.Fragment key={log.id || idx}>
                        <tr onClick={() => toggleRow(log.id)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(33, 150, 243, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)'), transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                          <td style={{ padding: '1rem' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)', textTransform: 'uppercase' }}>{log.event_type}</span></td>
                          <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{netInfo.proto}</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>{netInfo.pkts}</td>
                          <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{netInfo.src}</td>
                          <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{netInfo.dest}</td>
                        </tr>
                        {isExpanded && log.raw_event && (
                          <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <td colSpan="6" style={{ padding: '0' }}>
                              <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', color: '#d4d4d4', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', overflowX: 'auto', fontSize: '0.85rem' }}>
                                <div style={{ marginBottom: '0.5rem', color: '#4CAF50', fontWeight: 'bold' }}>// Suricata EVE Payload</div>
                                <pre style={{ margin: 0 }}>{JSON.stringify(log.raw_event, null, 2)}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Logs;