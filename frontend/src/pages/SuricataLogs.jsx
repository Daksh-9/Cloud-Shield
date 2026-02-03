import React from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataLogs = () => {
  const navigate = useNavigate();

  // Navigation Tabs
  const NavTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ddd' }}>
      <button onClick={() => navigate('/suricata/rules')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Rules Management</button>
      <button onClick={() => navigate('/suricata/upload')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Upload Rules</button>
      <button onClick={() => navigate('/suricata/config')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Configuration</button>
      <button onClick={() => navigate('/suricata/logs')} style={{ padding: '1rem', borderBottom: '3px solid #3498db', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Detection Logs</button>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Suricata Detection Logs</h1>
      <NavTabs />

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>2,847</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '3px solid #e74c3c' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Critical</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>45</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '3px solid #f39c12' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>High</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>234</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '3px solid #3498db' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Medium</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>892</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="text" placeholder="Search logs..." style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '300px' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e74c3c', color: 'white', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Severity: High <button style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer' }}>✕</button></span>
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3498db', color: 'white', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Category: DDoS <button style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer' }}>✕</button></span>
            <button style={{ border: 'none', background: 'none', color: '#3498db', cursor: 'pointer' }}>+ Add Filter</button>
          </div>
        </div>
        <div>
          <select style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option>Last Hour</option>
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem' }}>TIME</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>SID</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>SEVERITY</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>SIGNATURE / DETAILS</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>SRC IP</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                time: '14:35:23', sid: '2100498', sev: 'CRITICAL', color: '#e74c3c',
                sig: 'ET DROP Spamhaus DROP Listed Source',
                detail: '→ 10.0.1.100:80 | Proto: TCP | Packets: 234',
                src: '203.0.113.45'
              },
              {
                time: '14:34:56', sid: '2025356', sev: 'HIGH', color: '#f39c12',
                sig: 'ET SCAN SYN FIN Scan Detected',
                detail: '→ 10.0.2.0/24 | Proto: TCP | Packets: 89',
                src: '198.51.100.23'
              },
              {
                time: '14:34:12', sid: '2013028', sev: 'HIGH', color: '#f39c12',
                sig: 'ET DOS UDP Fragment Attack',
                detail: '→ 10.0.1.5:53 | Proto: UDP | Packets: 1,234',
                src: '192.0.2.67'
              }
            ].map((log, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{log.time}</td>
                <td style={{ padding: '1rem' }}>{log.sid}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ backgroundColor: log.color, color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{log.sev}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{log.sig}</div>
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>{log.detail}</div>
                </td>
                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{log.src}</td>
                <td style={{ padding: '1rem' }}>
                  <button style={{ marginRight: '0.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>Block IP</button>
                  <button style={{ cursor: 'pointer', padding: '0.25rem 0.5rem', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>Alert</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Footer */}
        <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', justifySelf: 'end' }}>
          <button style={{ padding: '0.5rem 1rem', marginRight: '1rem', cursor: 'pointer' }}>Export Logs</button>
          <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Generate Report</button>
        </div>
      </div>
    </div>
  );
};

export default SuricataLogs;