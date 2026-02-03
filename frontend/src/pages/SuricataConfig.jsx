import React from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataConfig = () => {
  const navigate = useNavigate();
  
  // Navigation Tabs
  const NavTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ddd' }}>
      <button onClick={() => navigate('/suricata/rules')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Rules Management</button>
      <button onClick={() => navigate('/suricata/upload')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Upload Rules</button>
      <button onClick={() => navigate('/suricata/config')} style={{ padding: '1rem', borderBottom: '3px solid #3498db', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Configuration</button>
      <button onClick={() => navigate('/suricata/logs')} style={{ padding: '1rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Detection Logs</button>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Suricata Configuration</h1>
      <NavTabs />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Pending Changes Column */}
        <div>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
             <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0 }}>Pending Changes: 5</h3>
               <button style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}>Discard All</button>
             </div>
             
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead style={{ backgroundColor: '#eee', fontSize: '0.8rem' }}>
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
                   <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                     <td style={{ padding: '0.75rem 1rem' }}>{change.type}</td>
                     <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{change.desc}</td>
                     <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                       <button style={{ color: '#3498db', border: 'none', background: 'none', cursor: 'pointer' }}>[{change.action}]</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             <div style={{ padding: '0.5rem', textAlign: 'center', color: '#3498db', cursor: 'pointer' }}>View All</div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Apply Changes</h3>
             <div style={{ padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '1.5rem' }}>
               <strong>⚠ Warning:</strong> Applying changes will restart the Suricata service. Estimated downtime: ~15 seconds.
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <input type="radio" name="apply" /> Apply and restart now
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <input type="radio" name="apply" defaultChecked /> Apply and schedule restart
               </label>
               <select style={{ marginLeft: '1.5rem', padding: '0.25rem', borderRadius: '4px' }}>
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
               <button style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Test Configuration</button>
               <button style={{ flex: 1, padding: '0.75rem', border: 'none', background: '#3498db', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply Changes</button>
             </div>
          </div>
        </div>

        {/* Configuration File Editor Preview */}
        <div>
          <div style={{ backgroundColor: '#2d3436', color: '#dfe6e9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', height: '100%' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#636e72', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>suricata.yaml</span>
              <div>
                <button style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', cursor: 'pointer' }}>Edit</button>
                <button style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Validate</button>
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