import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { suricataService } from '../services/suricata';
import { authService } from '../services/auth';

const SuricataRules = () => {
  const navigate = useNavigate();
  
  // --- Auth & Role State ---
  const [isAdmin, setIsAdmin] = useState(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false); 
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- Create Rule State ---
  const [createRuleData, setCreateRuleData] = useState({
    content: '',
    name: '',
    severity: 'medium'
  });

  // --- Upload / Analyst History State ---
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [ruleHistory, setRuleHistory] = useState([]);

  // --- View/Backup State ---
  const [fileContent, setFileContent] = useState(null);
  const [backups, setBackups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFileMetadata, setActiveFileMetadata] = useState(null);

  // --- Initialization ---
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    setIsAdmin(authService.isAdmin());
  }, [navigate]);

  // Load data depending on the active tab
  useEffect(() => {
    if (activeTab === 'view') {
      loadBackups();
      loadFileContent();
    } else if (activeTab === 'upload') {
      loadRuleHistory();
    }
  }, [activeTab]);

  // --- API Actions ---

  const loadRuleHistory = async () => {
    try {
      const data = await suricataService.getRuleHistory(50);
      setRuleHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await suricataService.getBackups();
      setBackups(data);
    } catch (err) {
      console.error("Failed to load backups", err);
    }
  };

  const loadFileContent = async () => {
    setLoading(true);
    try {
      const data = await suricataService.viewRulesFile(searchQuery);
      if (data.lines) {
        setFileContent(data.lines);
        setActiveFileMetadata(data.metadata);
      } else if (data.rules) {
        setFileContent(data.rules.map(r => r.content)); 
      }
    } catch (err) {
      setError('Failed to load file content.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await suricataService.createRule(
        createRuleData.content,
        createRuleData.name || undefined,
        createRuleData.severity
      );
      setSuccess(`Rule created successfully at line ${result.line_number}. Remember to Push Changes to Live!`);
      setCreateRuleData({ content: '', name: '', severity: 'medium' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    if (!isAdmin) {
      setError("Unauthorized: Only Admins can upload rules.");
      return;
    }

    setLoading(true);
    setError('');
    setUploadResult(null);

    try {
      const result = await suricataService.uploadRules(uploadFile);
      setUploadResult(result);
      setSuccess(`Upload processed: ${result.message}. Remember to Push Changes to Live!`);
      setUploadFile(null); 
      loadRuleHistory(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to restore ${backupId}? Current rules will be overwritten.`)) return;
    
    setLoading(true);
    try {
      await suricataService.restoreBackup(backupId);
      setSuccess(`Restored backup: ${backupId}. Remember to Push Changes to Live!`);
      await loadFileContent();
    } catch (err) {
      setError("Failed to restore backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadFileContent();
  };

  const handleReloadEngine = async () => {
    setIsReloading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await suricataService.reloadEngine();
      if (result.status === 'success') {
        setSuccess(result.message || 'Suricata engine reloaded successfully with the latest rules!');
      } else {
        setError(result.message || 'Failed to reload the Suricata engine.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Internal error while reloading the engine.');
    } finally {
      setIsReloading(false);
    }
  };

  // --- Render ---

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header with Reload Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, borderBottom: '3px solid #2196F3', paddingBottom: '0.5rem', display: 'inline-block' }}>
          Suricata Management
        </h1>
        
        <button
          onClick={handleReloadEngine}
          disabled={isReloading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isReloading ? '#9e9e9e' : '#f44336', 
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isReloading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'background-color 0.2s'
          }}
          title="Applies all pending rule changes to the live Suricata process"
        >
          {isReloading ? '↻ Reloading Engine...' : '🚀 Push Changes to Live'}
        </button>
      </div>

      {/* --- 4 Navigation Tabs --- */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'create' ? '#2196F3' : 'transparent',
            color: activeTab === 'create' ? '#fff' : '#666',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Create Rules
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'upload' ? '#2196F3' : 'transparent',
            color: activeTab === 'upload' ? '#fff' : '#666',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Upload & Analyst Rules
        </button>

        <button
          onClick={() => setActiveTab('view')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'view' ? '#2196F3' : 'transparent',
            color: activeTab === 'view' ? '#fff' : '#666',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          View Files
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('config')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'config' ? '#2196F3' : 'transparent',
              color: activeTab === 'config' ? '#fff' : '#666',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            System Config
          </button>
        )}
      </div>

      {/* --- Status Messages --- */}
      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', border: '1px solid #ffcdd2' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
          ✅ {success}
        </div>
      )}

      {/* ==================== 1. CREATE TAB ==================== */}
      {activeTab === 'create' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Create New Rule</h2>
          <form onSubmit={handleCreateRule}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Rule Name (Optional)</label>
                <input
                  type="text"
                  value={createRuleData.name}
                  onChange={(e) => setCreateRuleData({ ...createRuleData, name: e.target.value })}
                  placeholder="e.g., Detect SQL Injection"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Severity Preset</label>
                <select
                  value={createRuleData.severity}
                  onChange={(e) => setCreateRuleData({ ...createRuleData, severity: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}
                >
                  <option value="low">Low (Info)</option>
                  <option value="medium">Medium (Warning)</option>
                  <option value="high">High (Error)</option>
                  <option value="zero_trust">Zero Trust (Critical)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Rule Content</label>
              <textarea
                value={createRuleData.content}
                onChange={(e) => setCreateRuleData({ ...createRuleData, content: e.target.value })}
                rows={6}
                style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder='alert tcp any any -> any any (msg:"Suspicious Traffic"; sid:10001;)'
                required
              />
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Note: Valid Suricata syntax required. Parentheses must be balanced.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ 
                padding: '0.75rem 2rem', 
                backgroundColor: loading ? '#ccc' : '#2196F3', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: loading ? 'not-allowed' : 'pointer' 
              }}
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </form>
        </div>
      )}

      {/* ==================== 2. UPLOAD & ANALYST RULES TAB ==================== */}
      {activeTab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Section: Upload Box (Admin Only) */}
          {isAdmin ? (
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Bulk Upload Rules</h2>
              <div style={{ padding: '2rem', border: '2px dashed #ddd', borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: '#fafafa' }}>
                <input 
                  type="file" 
                  accept=".rules"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📂</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2196F3' }}>
                    {uploadFile ? uploadFile.name : "Click to Select .rules File"}
                  </div>
                </label>
              </div>

              {uploadFile && (
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={handleUpload} 
                    disabled={loading}
                    style={{ padding: '0.75rem 2rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    {loading ? 'Processing...' : 'Upload & Process'}
                  </button>
                </div>
              )}

              {uploadResult && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f4f8', borderRadius: '4px', border: '1px solid #d9e2ec' }}>
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'green' }}>✔ Processed: <strong>{uploadResult.processed_count}</strong></span>
                    <span style={{ margin: '0 1rem', color: '#ccc' }}>|</span>
                    <span style={{ color: 'orange' }}>⚠ Skipped: <strong>{uploadResult.skipped_count || uploadResult.skipped}</strong></span>
                  </p>
                </div>
              )}
            </div>
          ) : (
             <div style={{ padding: '1rem', textAlign: 'center', color: '#856404', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeeba' }}>
               Only Administrators can perform bulk rule uploads. You are viewing analyst history.
             </div>
          )}

          {/* Bottom Section: Analysts rules table */}
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Rules by Analysts (History)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Date</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Action</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Analyst</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Rule Details</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleHistory.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#555' }}>
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize', color: record.action === 'created' ? 'green' : '#2196F3', fontWeight: 'bold' }}>
                        {record.action}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        {record.user_id ? record.user_id.substring(0,8) + "..." : 'System'}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {record.metadata?.rule_name && <strong style={{ color: '#d35400' }}>{record.metadata.rule_name}<br/></strong>}
                        <span style={{ color: '#333' }}>{record.rule_content}</span>
                      </td>
                    </tr>
                  ))}
                  {ruleHistory.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No recent rule activities found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== 3. VIEW TAB (SPLIT SCREEN) ==================== */}
      {activeTab === 'view' && (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
          
          <div style={{ width: '320px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginTop: 0 }}>Search Content</h3>
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find rule..." 
                  style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Search
                </button>
              </form>
            </div>

            {activeFileMetadata && (
              <div style={{ fontSize: '0.85rem', color: '#555', backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '4px' }}>
                <div><strong>File:</strong> local.rules</div>
                <div><strong>Lines:</strong> {activeFileMetadata.line_count}</div>
                <div><strong>Last Modified:</strong><br/>{new Date(activeFileMetadata.modified).toLocaleString()}</div>
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>History & Backups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {backups.map((bk, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold' }}>{new Date(bk.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{new Date(bk.created_at).toLocaleTimeString()}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666' }}>{(bk.size / 1024).toFixed(1)} KB</span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleRestore(bk.filename)}
                          style={{ padding: '2px 8px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {backups.length === 0 && <p style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>No backups found.</p>}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfc' }}>
              <strong style={{ color: '#333' }}>local.rules</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button onClick={loadFileContent} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', background: '#fff' }}>↻ Refresh</button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#f8f9fa', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}>
               {loading ? (
                 <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading content...</div>
               ) : fileContent && fileContent.length > 0 ? (
                 fileContent.map((line, idx) => (
                   <div key={idx} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #f0f0f0' }}>
                     <div style={{ width: '40px', color: '#bbb', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</div>
                     <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: line.trim().startsWith('#') ? '#888' : '#333' }}>{line}</div>
                   </div>
                 ))
               ) : (
                 <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>File is empty or no content loaded.</div>
               )}
            </div>
          </div>

        </div>
      )}

      {/* ==================== 4. SYSTEM CONFIG TAB (ADMIN) ==================== */}
      {activeTab === 'config' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
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
      )}

    </div>
  );
};

export default SuricataRules;