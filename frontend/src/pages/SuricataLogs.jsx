import React, { useState, useEffect } from 'react';
// IMPORT useSearchParams to read the URL query
import { useNavigate, useSearchParams } from 'react-router-dom';

const SuricataLogs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // STATE: Initialize the search term from the URL if it exists
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Keep the state in sync if the URL changes while already on the page
  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // You could also update the URL here to make the search shareable
  };

  const NavTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
      <button onClick={() => navigate('/suricata/rules')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Rules Management</button>
      <button onClick={() => navigate('/suricata/upload')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Upload Rules</button>
      <button onClick={() => navigate('/suricata/config')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Configuration</button>
      <button onClick={() => navigate('/suricata/logs')} style={{ padding: '1rem', color: 'var(--text-primary)', borderBottom: '3px solid var(--accent-color)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Detection Logs</button>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ margin: '0 0 1rem 0' }}>Suricata Detection Logs</h1>
      <NavTabs />

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>2,847</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'var(--card-shadow)', borderBottom: '3px solid #F44336' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Critical</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F44336' }}>45</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'var(--card-shadow)', borderBottom: '3px solid #FF9800' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>High</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>234</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'var(--card-shadow)', borderBottom: '3px solid var(--accent-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Medium</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>892</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* UPDATED: Search input is now controlled by the state */}
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '300px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} 
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#F44336', color: 'white', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Severity: High <button style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer' }}>✕</button></span>
            <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--accent-color)', color: 'white', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Category: DDoS <button style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer' }}>✕</button></span>
            <button style={{ border: 'none', background: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>+ Add Filter</button>
          </div>
        </div>
        <div>
          <select style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <option>Last Hour</option>
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>TIME</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>SID</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>SEVERITY</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>SIGNATURE / DETAILS</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>SRC IP</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {/* The actual filtering of this mock data would happen here or via a backend call */}
            {[
              {
                time: '14:35:23', sid: '2100498', sev: 'CRITICAL', color: '#F44336',
                sig: 'ET DROP Spamhaus DROP Listed Source',
                detail: '→ 10.0.1.100:80 | Proto: TCP | Packets: 234',
                src: '203.0.113.45'
              },
              {
                time: '14:34:56', sid: '2025356', sev: 'HIGH', color: '#FF9800',
                sig: 'ET SCAN SYN FIN Scan Detected',
                detail: '→ 10.0.2.0/24 | Proto: TCP | Packets: 89',
                src: '198.51.100.23'
              },
              {
                time: '14:34:12', sid: '2013028', sev: 'HIGH', color: '#FF9800',
                sig: 'ET DOS UDP Fragment Attack',
                detail: '→ 10.0.1.5:53 | Proto: UDP | Packets: 1,234',
                src: '192.0.2.67'
              }
            ].map((log, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{log.time}</td>
                <td style={{ padding: '1rem' }}>{log.sid}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ backgroundColor: log.color, color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{log.sev}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{log.sig}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.detail}</div>
                </td>
                <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{log.src}</td>
                <td style={{ padding: '1rem' }}>
                  <button style={{ marginRight: '0.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Block IP</button>
                  <button style={{ cursor: 'pointer', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Alert</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Footer */}
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifySelf: 'end' }}>
          <button style={{ padding: '0.5rem 1rem', marginRight: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Export Logs</button>
          <button style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px' }}>Generate Report</button>
        </div>
      </div>
    </div>
  );
};

export default SuricataLogs;