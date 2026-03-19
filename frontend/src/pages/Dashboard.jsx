import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import { monitoringService } from '../services/monitoring';
import { alertsService } from '../services/alerts';
import { logsService } from '../services/logs';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // --- State ---
  const [alertStats, setAlertStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ cpu: 0, ram: 0, suricata: 'Unknown' });

  // --- Data Normalizers ---
  const standardAlert = (alert) => ({
    id: alert.id || alert._id || Date.now() + Math.random(),
    time: alert.created_at || alert.timestamp || new Date().toISOString(),
    title: alert.title || alert.message || alert.alert_type || 'Unknown Alert',
    severity: (alert.severity || 'Info').toLowerCase(),
    status: alert.status || 'open',
    // 🟢 FIX: Check root (for WebSocket) OR metadata (for REST API load)
    src: alert.src_ip || alert.metadata?.src_ip || 'Unknown',
    dest: alert.dest_ip || alert.metadata?.dest_ip || 'Unknown'
  });

  const standardLog = (log) => ({
    id: log.id || log._id || Date.now() + Math.random(),
    severity: log.severity || log.event_type || 'info',
    message: log.message || `${log.src_ip || 'System'} -> ${log.dest_ip || 'Event'} (${log.proto || 'Log'})`,
    time: log.timestamp || log.created_at || new Date().toISOString()
  });

  // --- Initial Real Data Load ---
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all dashboard data concurrently from backend services
        const [crit, high, med, low, metricsRes, alertsRes, logsRes] = await Promise.all([
          alertsService.getAlertStats({ status: 'open', severity: 'critical' }).catch(() => 0),
          alertsService.getAlertStats({ status: 'open', severity: 'high' }).catch(() => 0),
          alertsService.getAlertStats({ status: 'open', severity: 'medium' }).catch(() => 0),
          alertsService.getAlertStats({ status: 'open', severity: 'low' }).catch(() => 0),
          monitoringService.getMetrics().catch(() => ({})),
          monitoringService.getRecentAlerts(25).catch(() => []),
          monitoringService.getRecentLogs(35).catch(() => [])
        ]);

        // Safely parse count objects or raw numbers
        const getCount = (res) => (res && typeof res.count === 'number') ? res.count : (typeof res === 'number' ? res : 0);

        setAlertStats({
          critical: getCount(crit),
          high: getCount(high),
          medium: getCount(med),
          low: getCount(low)
        });

        setSystemHealth({
          cpu: metricsRes?.cpu_usage || metricsRes?.cpu || 0,
          ram: metricsRes?.ram_usage || metricsRes?.ram || 0,
          suricata: metricsRes?.suricata_status || metricsRes?.suricata || 'Active'
        });

        // Parse list responses (handling possible { items: [...] } wrappers)
        const rawAlerts = Array.isArray(alertsRes) ? alertsRes : (alertsRes?.items || []);
        setRecentAlerts(rawAlerts.map(standardAlert));

        const rawLogs = Array.isArray(logsRes) ? logsRes : (logsRes?.items || []);
        setSystemLogs(rawLogs.map(standardLog));

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // --- WebSocket Subscriptions ---
  useSocket((event) => {
    if (!event || !event.type) return;

    if (event.type === 'ALERT_NEW' && event.payload) {
      const alert = standardAlert(event.payload);

      setAlertStats((prev) => {
        const sevKey = alert.severity;
        if (!['critical', 'high', 'medium', 'low'].includes(sevKey)) return prev;
        return { ...prev, [sevKey]: (prev[sevKey] || 0) + 1 };
      });

      setRecentAlerts((prev) => [alert, ...prev].slice(0, 25));
    }

    if (event.type === 'LOG_UPDATE' && event.payload) {
      const log = standardLog(event.payload);
      setSystemLogs((prev) => [log, ...prev].slice(0, 35));
    }
    
    if (event.type === 'METRICS_UPDATE' && event.payload) {
       setSystemHealth(prev => ({ ...prev, ...event.payload }));
    }
  });

  // --- Dynamic Chart Aggregations ---
  const vectorData = useMemo(() => {
    if (!recentAlerts.length) return [];
    const counts = {};
    recentAlerts.forEach(a => {
      let name = a.title;
      // Truncate long rule names for the chart
      if (name.length > 20) name = name.substring(0, 20) + '...';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 vectors
  }, [recentAlerts]);

  const trendData = useMemo(() => {
    // Group recent alerts into hourly buckets for the trend graph
    const buckets = {};
    const now = new Date();
    
    // Create empty buckets for the last 6 hours to ensure a continuous line
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      buckets[hourStr] = { time: hourStr, critical: 0, high: 0, medium: 0, low: 0 };
    }
    
    recentAlerts.forEach(a => {
      const d = new Date(a.time);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!buckets[hourStr]) {
        buckets[hourStr] = { time: hourStr, critical: 0, high: 0, medium: 0, low: 0 };
      }
      const sev = a.severity;
      if (buckets[hourStr][sev] !== undefined) {
        buckets[hourStr][sev]++;
      }
    });

    return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time));
  }, [recentAlerts]);


  // --- Helpers ---
  const getSeverityColor = (severity) => {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical') return '#F44336'; 
    if (sev === 'high' || sev === 'error') return '#FF9800'; 
    if (sev === 'medium' || sev === 'warning') return '#FFC107'; 
    if (sev === 'low' || sev === 'info') return '#2196F3'; 
    return '#9E9E9E'; 
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxShadow: 'var(--card-shadow)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Time: {label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span>{entry.name.toUpperCase()}:</span>
              <strong>{entry.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* --- HEADER --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            🛡️ Detection Dashboard
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Live Threat Monitoring & Analysis</p>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', display: 'flex', gap: '1.5rem' }}>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Server Resources</div>
               <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                 CPU: {systemHealth.cpu}% | RAM: {systemHealth.ram}%
               </div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>IDS Engine</div>
               <div style={{ color: systemHealth.suricata.toLowerCase() === 'active' ? '#4CAF50' : '#FF9800', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: systemHealth.suricata.toLowerCase() === 'active' ? '#4CAF50' : '#FF9800', animation: systemHealth.suricata.toLowerCase() === 'active' ? 'pulse 2s infinite' : 'none' }}></span>
                 {systemHealth.suricata}
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- ROW 1: KPI CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Critical Threats', count: alertStats.critical, color: '#F44336', icon: '🚨' },
          { label: 'High Alerts', count: alertStats.high, color: '#FF9800', icon: '⚠️' },
          { label: 'Medium Warnings', count: alertStats.medium, color: '#FFC107', icon: '⚡' },
          { label: 'Low / Info Events', count: alertStats.low, color: '#2196F3', icon: 'ℹ️' },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', borderTop: `4px solid ${stat.color}`, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.05, userSelect: 'none' }}>{stat.icon}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', zIndex: 1 }}>{stat.label}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--text-primary)', zIndex: 1 }}>
              {loading ? '...' : stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* --- ROW 2: CHARTS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Trend Chart (Area) */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📈</span> Threat Trend Activity
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F44336" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F44336" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9800" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF9800" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                  <Area type="monotone" dataKey="critical" stroke="#F44336" fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} />
                  <Area type="monotone" dataKey="high" stroke="#FF9800" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Gathering historical data...</div>
            )}
          </div>
        </div>

        {/* Attack Vectors Chart (Bar) */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯</span> Top Attack Vectors
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {vectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vectorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} width={100} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}/>
                  <Bar dataKey="count" fill="var(--accent-color)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Awaiting alert data...</div>
            )}
          </div>
        </div>

      </div>

      {/* --- ROW 3: LIVE FEEDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Active Threats Table */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔴</span> Live Threat Feed
            </h3>
            <button onClick={() => navigate('/alerts')} style={{ padding: '0.4rem 1rem', background: 'transparent', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
              View All Alerts →
            </button>
          </div>
          
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Time</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Severity</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Signature / Rule</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Source ➔ Dest</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active threats detected in the loaded window.</td></tr>
                ) : (
                  recentAlerts.map((row, i) => (
                    <tr key={row.id || i} style={{ borderTop: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {new Date(row.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: getSeverityColor(row.severity), backgroundColor: `${getSeverityColor(row.severity)}15`, border: `1px solid ${getSeverityColor(row.severity)}50` }}>
                          {row.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.title}</td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <span style={{ color: '#F44336' }}>{row.src}</span>
                        <span style={{ color: 'var(--text-secondary)', margin: '0 0.5rem' }}>➔</span>
                        <span style={{ color: '#4CAF50' }}>{row.dest}</span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button onClick={() => navigate(`/alerts`)} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Triage</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Event Stream */}
        <div style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252526' }}>
            <h3 style={{ margin: 0, color: '#d4d4d4', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <span>📡</span> Raw Event Stream
            </h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#4CAF50' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4CAF50', animation: 'pulse 1.5s infinite' }}></span> LIVE
            </span>
          </div>
          
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {systemLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666' }}>Waiting for ingestion...</div>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '1rem', color: '#d4d4d4', paddingBottom: '0.25rem' }}>
                    <span style={{ color: '#569cd6', minWidth: '65px' }}>{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    <span style={{ color: getSeverityColor(log.severity), minWidth: '50px', fontWeight: 'bold' }}>[{log.severity.substring(0,4).toUpperCase()}]</span>
                    <span style={{ color: '#ce9178', wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Basic CSS for Pulse Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
      `}} />
    </div>
  );
};

export default Dashboard;