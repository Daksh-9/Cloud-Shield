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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- Create Rule State ---
  const [createRuleData, setCreateRuleData] = useState({
    content: '',
    name: '',
    severity: 'medium' // Default severity
  });
  const [validationErrors, setValidationErrors] = useState([]);

  // --- Upload State (Admin Only) ---
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

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
    // Check Role
    setIsAdmin(authService.isAdmin());
  }, [navigate]);

  // Load backups when entering View tab
  useEffect(() => {
    if (activeTab === 'view') {
      loadBackups();
      loadFileContent(); // Load current live rules by default
    }
  }, [activeTab]);

  // --- API Actions ---

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
      // If search query exists, use search endpoint, else view endpoint
      const data = await suricataService.viewRulesFile(searchQuery);
      if (data.lines) {
        setFileContent(data.lines);
        setActiveFileMetadata(data.metadata);
      } else if (data.rules) {
        // Handle search results structure
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
      setSuccess(`Rule created successfully at line ${result.line_number}`);
      // Reset form
      setCreateRuleData({ content: '', name: '', severity: 'medium' });
      setValidationErrors([]);
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
      setSuccess(`Upload processed: ${result.message}`);
      setUploadFile(null); // Clear file input
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
      setSuccess(`Restored backup: ${backupId}`);
      await loadFileContent(); // Refresh view
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

  // --- Render ---

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ marginBottom: '1.5rem', borderBottom: '3px solid #2196F3', paddingBottom: '0.5rem', display: 'inline-block' }}>
        Suricata Rules Management
      </h1>

      {/* --- Navigation Tabs --- */}
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

        {/* Admin Only Upload Tab */}
        {isAdmin && (
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
            Upload Rules (Admin)
          </button>
        )}

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

      {/* ==================== CREATE TAB ==================== */}
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
              
              {/* Severity Selection */}
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

      {/* ==================== UPLOAD TAB (ADMIN ONLY) ==================== */}
      {activeTab === 'upload' && isAdmin && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Bulk Upload Rules</h2>
          
          <div style={{ padding: '3rem', border: '2px dashed #ddd', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem', backgroundColor: '#fafafa' }}>
            <input 
              type="file" 
              accept=".rules"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2196F3' }}>
                {uploadFile ? uploadFile.name : "Click to Select .rules File"}
              </div>
              <p style={{ color: '#666', marginTop: '1rem' }}>
                System will create an automatic backup before processing.
              </p>
            </label>
          </div>

          {uploadFile && (
            <div style={{ textAlign: 'center' }}>
               <button 
                onClick={handleUpload} 
                disabled={loading}
                style={{ padding: '0.75rem 2rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                {loading ? 'Processing...' : 'Upload & Process'}
              </button>
            </div>
          )}

          {/* Upload Results Log */}
          {uploadResult && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f4f8', borderRadius: '4px', border: '1px solid #d9e2ec' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Upload Summary</h3>
              <p>
                <span style={{ color: 'green' }}>✔ Processed: <strong>{uploadResult.processed_count}</strong></span>
                <span style={{ margin: '0 1rem', color: '#ccc' }}>|</span>
                <span style={{ color: 'orange' }}>⚠ Skipped: <strong>{uploadResult.skipped}</strong></span>
              </p>
              
              {uploadResult.errors.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Errors:</strong>
                  <ul style={{ color: '#d32f2f', fontSize: '0.9rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #ffcdd2' }}>
                    {uploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Security Fallback for Non-Admins */}
      {activeTab === 'upload' && !isAdmin && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#c62828', backgroundColor: '#ffebee', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '1rem' }}>⛔ Access Denied</h2>
          <p>You do not have permission to access the Bulk Upload feature.</p>
          <p>This action is restricted to Administrators.</p>
        </div>
      )}

      {/* ==================== VIEW TAB (SPLIT SCREEN) ==================== */}
      {activeTab === 'view' && (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
          
          {/* LEFT PANEL: Controls, Search, Backups */}
          <div style={{ width: '320px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Search */}
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

            {/* Metadata */}
            {activeFileMetadata && (
              <div style={{ fontSize: '0.85rem', color: '#555', backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '4px' }}>
                <div><strong>File:</strong> local.rules</div>
                <div><strong>Lines:</strong> {activeFileMetadata.line_count}</div>
                <div><strong>Last Modified:</strong><br/>{new Date(activeFileMetadata.modified).toLocaleString()}</div>
              </div>
            )}

            {/* Backups List */}
            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>History & Backups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {backups.map((bk, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold' }}>{new Date(bk.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{new Date(bk.created_at).toLocaleTimeString()}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666' }}>{(bk.size / 1024).toFixed(1)} KB</span>
                      
                      {/* Restore Button (Admin Only) */}
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

          {/* RIGHT PANEL: Content Viewer */}
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
    </div>
  );
};

export default SuricataRules;