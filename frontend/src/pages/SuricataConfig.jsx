import React from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataConfig = () => {
  const navigate = useNavigate();
  
  // Navigation Tabs
  const NavTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
      <button onClick={() => navigate('/suricata/rules')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Rules Management</button>
      <button onClick={() => navigate('/suricata/upload')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Upload Rules</button>
      <button onClick={() => navigate('/suricata/config')} style={{ padding: '1rem', color: 'var(--text-primary)', borderBottom: '3px solid var(--accent-color)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Configuration</button>
      <button onClick={() => navigate('/suricata/logs')} style={{ padding: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Detection Logs</button>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ margin: '0 0 1rem 0' }}>Suricata Configuration</h1>
      <NavTabs />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Pending Changes Column */}
        <div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', marginBottom: '2rem' }}>
             <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0 }}>Pending Changes: 5</h3>
               <button style={{ color: '#F44336', background: 'none', border: 'none', cursor: 'pointer' }}>Discard All</button>
             </div>
             
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead style={{ backgroundColor: 'var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                 <tr>
                   <th style={{ textAlign: 'left', padding: '0.5rem 1rem' }}>CHANGE TYPE</th>
                   <th style={{ textAlign: 'left', padding: '0.5rem 1rem' }}>DESCRIPTION</th>
                   <th style={{ textAlign: 'right', padding: '0.5rem 1rem' }}>ACTION</th>
                 </tr>
               </thead>
               <tbody>
                 {[
                   { type: 'Rule Enabled', desc: 'SID 2100498', action: 'Undo' },
                   { type: 'Rule Disabled', desc: 'SID 2013527', action: 'Undo' },
                   { type: 'Rule Modified', desc: 'SID 2025356', action: 'Undo' },
                   { type: 'Config Changed', desc: 'alert-threshold', action: 'Undo' },
                   { type: 'Rules Imported', desc: 'custom-rules.txt', action: 'Undo' },
                 ].map((change, idx) => (
                   <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                     <td style={{ padding: '0.75rem 1rem' }}>{change.type}</td>
                     <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{change.desc}</td>
                     <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                       <button style={{ color: 'var(--accent-color)', border: 'none', background: 'none', cursor: 'pointer' }}>[{change.action}]</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--accent-color)', cursor: 'pointer' }}>View All</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '1.5rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Apply Changes</h3>
             <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #FF9800' }}>
               <strong>⚠ Warning:</strong> Applying changes will restart the Suricata service. Estimated downtime: ~15 seconds.
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <input type="radio" name="apply" /> Apply and restart now
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <input type="radio" name="apply" defaultChecked /> Apply and schedule restart
               </label>
               <select style={{ marginLeft: '1.5rem', padding: '0.25rem', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                 <option>2026-02-04 23:00</option>
               </select>
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input type="checkbox" defaultChecked /> Create backup before applying
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input type="checkbox" defaultChecked /> Validate configuration before restart
               </label>
             </div>

             <div style={{ display: 'flex', gap: '1rem' }}>
               <button style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Test Configuration</button>
               <button style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'var(--accent-color)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply Changes</button>
             </div>
          </div>
        </div>

        {/* Configuration File Editor Preview */}
        <div>
          <div style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', height: '100%' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>suricata.yaml</span>
              <div>
                <button style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Edit</button>
                <button style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Validate</button>
              </div>
            </div>
            <pre style={{ padding: '1rem', fontFamily: 'monospace', lineHeight: '1.5', margin: 0, overflow: 'auto' }}>
{`# Suricata Configuration
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16, 10.0.0.0/8]"
    EXTERNAL_NET: "!$HOME_NET"

default-rule-path: C:\\Program Files\\Suricata\\rules
rule-files:
  - emerging-ddos.rules
  - custom-rules.txt
  - local.rules

alert-threshold:
  type: threshold
  track: by_src
  count: 10
  seconds: 60

outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuricataConfig;