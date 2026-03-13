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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)' }}>
      
      {/* Header with Reload Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, borderBottom: '3px solid var(--accent-color)', paddingBottom: '0.5rem', display: 'inline-block' }}>
          Suricata Management
        </h1>
        
        <button
          onClick={handleReloadEngine}
          disabled={isReloading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isReloading ? 'var(--text-secondary)' : '#f44336', 
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isReloading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--card-shadow)',
            transition: 'background-color 0.2s'
          }}
          title="Applies all pending rule changes to the live Suricata process"
        >
          {isReloading ? '↻ Reloading Engine...' : '🚀 Push Changes to Live'}
        </button>
      </div>

      {/* --- 4 Navigation Tabs --- */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'create' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'create' ? '#fff' : 'var(--text-secondary)',
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
            backgroundColor: activeTab === 'upload' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'upload' ? '#fff' : 'var(--text-secondary)',
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
            backgroundColor: activeTab === 'view' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'view' ? '#fff' : 'var(--text-secondary)',
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
              backgroundColor: activeTab === 'config' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'config' ? '#fff' : 'var(--text-secondary)',
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
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '4px', border: '1px solid #F44336' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '4px', border: '1px solid #4CAF50' }}>
          ✅ {success}
        </div>
      )}

      {/* ==================== 1. CREATE TAB ==================== */}
      {activeTab === 'create' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
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
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Severity Preset</label>
                <select
                  value={createRuleData.severity}
                  onChange={(e) => setCreateRuleData({ ...createRuleData, severity: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
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
                style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                placeholder='alert tcp any any -> any any (msg:"Suspicious Traffic"; sid:10001;)'
                required
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Note: Valid Suricata syntax required. Parentheses must be balanced.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ 
                padding: '0.75rem 2rem', 
                backgroundColor: loading ? 'var(--text-secondary)' : 'var(--accent-color)', 
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
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Bulk Upload Rules</h2>
              <div style={{ padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: 'var(--bg-primary)' }}>
                <input 
                  type="file" 
                  accept=".rules"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📂</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
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
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--hover-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: 0 }}>
                    <span style={{ color: '#4CAF50' }}>✔ Processed: <strong>{uploadResult.processed_count}</strong></span>
                    <span style={{ margin: '0 1rem', color: 'var(--border-color)' }}>|</span>
                    <span style={{ color: '#FF9800' }}>⚠ Skipped: <strong>{uploadResult.skipped_count || uploadResult.skipped}</strong></span>
                  </p>
                </div>
              )}
            </div>
          ) : (
             <div style={{ padding: '1rem', textAlign: 'center', color: '#FF9800', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px', border: '1px solid #FF9800' }}>
               Only Administrators can perform bulk rule uploads. You are viewing analyst history.
             </div>
          )}

          {/* Bottom Section: Analysts rules table */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Rules by Analysts (History)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)' }}>Date</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)' }}>Action</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)' }}>Analyst</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)' }}>Rule Details</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleHistory.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize', color: record.action === 'created' ? '#4CAF50' : 'var(--accent-color)', fontWeight: 'bold' }}>
                        {record.action}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        {record.user_id ? record.user_id.substring(0,8) + "..." : 'System'}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {record.metadata?.rule_name && <strong style={{ color: '#FF9800' }}>{record.metadata.rule_name}<br/></strong>}
                        <span style={{ color: 'var(--text-primary)' }}>{record.rule_content}</span>
                      </td>
                    </tr>
                  ))}
                  {ruleHistory.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No recent rule activities found.</td></tr>
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
          
          <div style={{ width: '320px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: 0 }}>Search Content</h3>
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find rule..." 
                  style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
                <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Search
                </button>
              </form>
            </div>

            {activeFileMetadata && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '4px' }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>File:</strong> local.rules</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Lines:</strong> {activeFileMetadata.line_count}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Last Modified:</strong><br/>{new Date(activeFileMetadata.modified).toLocaleString()}</div>
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>History & Backups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {backups.map((bk, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 'bold' }}>{new Date(bk.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{new Date(bk.created_at).toLocaleTimeString()}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{(bk.size / 1024).toFixed(1)} KB</span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleRestore(bk.filename)}
                          style={{ padding: '2px 8px', backgroundColor: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {backups.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No backups found.</p>}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>local.rules</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button onClick={loadFileContent} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>↻ Refresh</button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--bg-secondary)', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}>
               {loading ? (
                 <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading content...</div>
               ) : fileContent && fileContent.length > 0 ? (
                 fileContent.map((line, idx) => (
                   <div key={idx} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                     <div style={{ width: '40px', color: 'var(--text-secondary)', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</div>
                     <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: line.trim().startsWith('#') ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{line}</div>
                   </div>
                 ))
               ) : (
                 <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>File is empty or no content loaded.</div>
               )}
            </div>
          </div>

        </div>
      )}

      {/* ==================== 4. SYSTEM CONFIG TAB (ADMIN) ==================== */}
      {activeTab === 'config' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
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

          <div>
            <div style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', height: '100%' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>suricata.yaml</span>
                <div>
                  <button style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Edit</button>
                  <button style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Validate</button>
                </div>
              </div>
              <pre style={{ padding: '1rem', fontFamily: 'monospace', lineHeight: '1.5', margin: 0, overflow: 'auto', color: 'var(--sidebar-text)' }}>
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