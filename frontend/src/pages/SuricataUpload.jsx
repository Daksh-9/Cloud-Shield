import React from 'react';
import { useNavigate } from 'react-router-dom';

const SuricataUpload = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Upload Suricata Rules</h1>
        <button onClick={() => navigate('/suricata/rules')} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}>← Back</button>
      </div>

      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        
        {/* Upload Method */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Upload Method:</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" defaultChecked /> File Upload
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" /> URL Import
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="method" /> Text Paste
            </label>
          </div>
        </div>

        {/* Drag Drop Zone */}
        <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '3rem', textAlign: 'center', marginBottom: '2rem', backgroundColor: 'var(--bg-primary)' }}>
           <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
           <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Drag & Drop rule files here</div>
           <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>or click to browse</div>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supported: .rules, .txt | Max size: 10 MB</div>
        </div>

        {/* Uploaded Files List */}
        <div style={{ marginBottom: '2rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Uploaded Files</h3>
           
           <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ color: '#4CAF50' }}>✓</span>
                 <strong>emerging-ddos.rules</strong>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>234 KB</span>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>Validated: 892 rules found | Status: Valid syntax</div>
             </div>
             <button style={{ border: 'none', background: 'none', color: '#F44336', cursor: 'pointer' }}>✕</button>
           </div>

           <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(244, 67, 54, 0.05)' }}>
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ color: '#FF9800' }}>⚠</span>
                 <strong>custom-rules.txt</strong>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>12 KB</span>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>Validated: 45 rules, 2 warnings</div>
               <div style={{ fontSize: '0.8rem', color: '#F44336', marginLeft: '1.5rem' }}>Warning: Duplicate SID 1000001</div>
             </div>
             <button style={{ border: 'none', background: 'none', color: '#F44336', cursor: 'pointer' }}>✕</button>
           </div>
        </div>

        {/* Import Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Import Options</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rule Category</label>
              <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option>DDoS Detection</option>
                <option>Custom Rules</option>
                <option>Malware</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Priority</label>
              <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
             <label><input type="checkbox" /> Enable all rules by default</label>
             <label><input type="checkbox" defaultChecked /> Validate rules before import</label>
             <label><input type="checkbox" defaultChecked /> Check for duplicate SIDs</label>
             <label><input type="checkbox" /> Overwrite existing rules</label>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div>
             <strong>Validation Summary:</strong> Total: 937 | Valid: 935 | Warnings: 2
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}>Validate Again</button>
            <button style={{ padding: '0.75rem 1.5rem', border: 'none', background: '#4CAF50', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Import Rules</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuricataUpload;