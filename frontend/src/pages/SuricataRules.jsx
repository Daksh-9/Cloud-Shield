import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataRules = () => {
  const navigate = useNavigate();
  const [expandedCategory, setExpandedCategory] = useState('DDoS Detection');

  // Navigation Tabs
  const NavTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ddd' }}>
      <button 
        onClick={() => navigate('/suricata/rules')} 
        style={{ 
          padding: '1rem', 
          background: 'none', 
          border: 'none', 
          borderBottom: '3px solid #3498db', 
          fontWeight: 'bold', 
          cursor: 'pointer' 
        }}
      >
        Rules Management
      </button>
      <button onClick={() => navigate('/suricata/upload')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Upload Rules</button>
      <button onClick={() => navigate('/suricata/config')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Configuration</button>
      <button onClick={() => navigate('/suricata/logs')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Detection Logs</button>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Suricata Rules Management</h1>
      <NavTabs />

      {/* Suricata Status Panel */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Suricata Status</h3>
          <div style={{ display: 'flex', gap: '2rem', color: '#555' }}>
            <span>Status: <strong style={{ color: '#2ecc71' }}>● Running</strong></span>
            <span>Version: <strong>8.0.3</strong></span>
            <span>Uptime: <strong>5d 12h 34m</strong></span>
            <span>Mode: <strong>IPS</strong></span>
          </div>
        </div>
        <div>
           <span style={{ marginRight: '1rem' }}>CPU: <strong>12%</strong></span>
           <span>Memory: <strong>2.4 GB</strong></span>
        </div>
      </div>

      {/* Rule Categories */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Rule Categories</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input type="text" placeholder="Search rules..." style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }} />
            <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Filter ▼</button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem' }}>CATEGORY</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Total</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Enabled</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Triggers</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Emerging Threats', total: 4523, enabled: 4201, triggers: 1247 },
              { name: 'DDoS Detection', total: 892, enabled: 856, triggers: 342, expanded: true },
              { name: 'Malware', total: 2341, enabled: 2103, triggers: 89 },
              { name: 'Exploit Kits', total: 1567, enabled: 1445, triggers: 23 },
              { name: 'Web Attacks', total: 3214, enabled: 2987, triggers: 567 },
              { name: 'Custom Rules', total: 45, enabled: 45, triggers: 12 },
            ].map((cat) => (
              <React.Fragment key={cat.name}>
                <tr style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: expandedCategory === cat.name ? '#f0f7ff' : 'transparent' }} onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}>
                  <td style={{ padding: '1rem' }}>{expandedCategory === cat.name ? '▼' : '►'} {cat.name}</td>
                  <td style={{ padding: '1rem' }}>{cat.total}</td>
                  <td style={{ padding: '1rem' }}>{cat.enabled}</td>
                  <td style={{ padding: '1rem' }}>{cat.triggers}</td>
                </tr>
                {/* Expanded View */}
                {expandedCategory === cat.name && cat.name === 'DDoS Detection' && (
                  <tr>
                    <td colSpan="4" style={{ padding: '0', backgroundColor: '#fafafa' }}>
                      <div style={{ padding: '1rem 2rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>DDoS Detection Rules (Expanded)</h4>
                        <table style={{ width: '100%', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ color: '#666' }}>
                              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>SID</th>
                              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>SIGNATURE</th>
                              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>STATUS</th>
                              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>TRIGGERS</th>
                              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { sid: 2100498, name: 'ET DROP Spamhaus', status: 'ON', triggers: 234, active: true },
                              { sid: 2025356, name: 'ET SCAN SYN FIN', status: 'ON', triggers: 89, active: true },
                              { sid: 2013028, name: 'ET DOS UDP Fragment', status: 'ON', triggers: 12, active: true },
                              { sid: 2013527, name: 'ET DOS Possible ICMP', status: 'OFF', triggers: 0, active: false },
                            ].map(rule => (
                              <tr key={rule.sid} style={{ borderTop: '1px solid #eee' }}>
                                <td style={{ padding: '0.75rem 0' }}>{rule.sid}</td>
                                <td style={{ padding: '0.75rem 0' }}>
                                  <span style={{ color: rule.active ? '#2ecc71' : '#95a5a6' }}>●</span> {rule.name}
                                </td>
                                <td style={{ padding: '0.75rem 0' }}>{rule.status}</td>
                                <td style={{ padding: '0.75rem 0' }}>{rule.triggers}</td>
                                <td style={{ padding: '0.75rem 0' }}>
                                  <button style={{ marginRight: '0.5rem', cursor: 'pointer' }}>Edit</button>
                                  <button style={{ marginRight: '0.5rem', cursor: 'pointer', color: rule.active ? '#e74c3c' : '#2ecc71' }}>{rule.active ? 'Disable' : 'Enable'}</button>
                                  <button style={{ cursor: 'pointer', color: '#3498db' }}>View Alerts</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            <div>Last Update: 2026-02-03 03:00 UTC</div>
            <div>Source: Emerging Threats, Custom</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Configure Auto-Update</button>
            <button style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Update Rules Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuricataRules;