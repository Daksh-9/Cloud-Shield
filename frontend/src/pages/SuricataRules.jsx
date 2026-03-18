import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { suricataService } from '../services/suricata';
import { authService } from '../services/auth';

// --- Pre-defined Rule Templates ---
const RULE_TEMPLATES = [
  { id: '', label: '-- Select a Rule Template --', content: '', name: '', severity: 'medium' },
  { id: 'sql_inj', label: 'Detect SQL Injection', content: 'alert tcp $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS (msg:"SQL Injection Attempt"; flow:established,to_server; content:"UNION SELECT"; nocase; sid:1000001; rev:1;)', name: 'SQL Injection', severity: 'high' },
  { id: 'ssh_brute', label: 'Detect SSH Brute Force', content: 'alert tcp $EXTERNAL_NET any -> $HOME_NET 22 (msg:"Possible SSH Brute Force"; flow:established,to_server; content:"SSH-"; threshold:type limit, track by_src, count 5, seconds 60; sid:1000002; rev:1;)', name: 'SSH Brute Force', severity: 'medium' },
  { id: 'malware_c2', label: 'Detect Malware C2 Beacon', content: 'alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Malware C2 Beaconing"; flow:established,to_server; http.method; content:"POST"; http.uri; content:"/login/process.php"; sid:1000003; rev:1;)', name: 'Malware Beacon', severity: 'zero_trust' },
  { id: 'ping_sweep', label: 'Detect ICMP Ping Sweep', content: 'alert icmp $EXTERNAL_NET any -> $HOME_NET any (msg:"ICMP Ping Sweep Detected"; dsize:0; itype:8; threshold:type both, track by_src, count 10, seconds 10; sid:1000004; rev:1;)', name: 'Ping Sweep', severity: 'low' }
];

// --- Mock YAML Config Content ---
const MOCK_YAML_LINES = [
  "# Suricata Configuration",
  "vars:",
  "  address-groups:",
  "    HOME_NET: \"[192.168.0.0/16, 10.0.0.0/8]\"",
  "    EXTERNAL_NET: \"!$HOME_NET\"",
  "",
  "default-rule-path: C:\\Program Files\\Suricata\\rules",
  "rule-files:",
  "  - emerging-ddos.rules",
  "  - custom-rules.txt",
  "  - local.rules",
  "",
  "alert-threshold:",
  "  type: threshold",
  "  track: by_src",
  "  count: 10",
  "  seconds: 60",
  "",
  "outputs:",
  "  - eve-log:",
  "      enabled: yes",
  "      filetype: regular",
  "      filename: eve.json"
];

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
  const [copiedLine, setCopiedLine] = useState(null);

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

  // --- Diff View State ---
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffData, setDiffData] = useState({ backupId: '', backupContent: [], currentContent: [] });

  // --- Initialization ---
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    setIsAdmin(authService.isAdmin());
  }, [navigate]);

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

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    const template = RULE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCreateRuleData({
        content: template.content,
        name: template.name,
        severity: template.severity
      });
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
      
      const templateSelect = document.getElementById("template-select");
      if (templateSelect) templateSelect.value = ""; 
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create rule. Check formatting.');
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
      setSuccess(`Upload processed successfully. Remember to Push Changes to Live!`);
      setUploadFile(null); 
      loadRuleHistory(); 
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
      setDiffModalOpen(false); 
    } catch (err) {
      setError("Failed to restore backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDiff = async (backupId) => {
    setLoading(true);
    try {
      const backupData = await suricataService.viewBackupFile(backupId);
      const currentData = await suricataService.viewRulesFile(''); 
      
      setDiffData({
        backupId: backupId,
        backupContent: backupData.lines || [],
        currentContent: currentData.lines || []
      });
      setDiffModalOpen(true);
    } catch (err) {
      setError("Failed to load diff comparison data.");
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

  const handleCopyRule = (line, idx) => {
    navigator.clipboard.writeText(line.trim());
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  // --- UI Helper: Syntax Highlighting for Suricata Rules ---
  // Modified slightly to allow passing `null` for idx to hide line numbers in the Preview/History
  const renderRuleLine = (line, idx = null) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('#')) {
      return (
        <div key={idx || Math.random()} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', backgroundColor: idx !== null && idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent' }}>
          {idx !== null && <div style={{ width: '40px', textAlign: 'right', userSelect: 'none', opacity: 0.5 }}>{idx + 1}</div>}
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{trimmed}</div>
        </div>
      );
    }

    const splitIndex = trimmed.indexOf('(');
    let header = trimmed;
    let options = '';
    
    if (splitIndex !== -1) {
      header = trimmed.substring(0, splitIndex);
      options = trimmed.substring(splitIndex);
    }

    const headerParts = header.trim().split(' ');
    const action = headerParts.shift() || 'alert'; 
    const protocol = headerParts.shift() || 'tcp'; 
    const routing = headerParts.join(' '); 

    let actionColor = 'var(--text-primary)';
    if (action === 'alert') actionColor = '#F44336'; 
    else if (action === 'drop' || action === 'reject') actionColor = '#E91E63'; 
    else if (action === 'pass') actionColor = '#4CAF50'; 

    return (
      <div key={idx || Math.random()} style={{ 
        padding: '1rem', display: 'flex', gap: '1rem', backgroundColor: idx !== null && idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent', borderLeft: `4px solid ${actionColor}`, position: 'relative', borderRadius: idx === null ? '4px' : '0'
      }}>
        {idx !== null && <div style={{ width: '36px', color: 'var(--text-secondary)', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</div>}
        <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <strong style={{ color: actionColor }}>{action}</strong>
            <strong style={{ color: '#2196F3' }}>{protocol}</strong>
            <span style={{ color: 'var(--text-primary)' }}>{routing}</span>
          </div>
          {options && <div style={{ color: '#FF9800', marginLeft: idx !== null ? '1rem' : '0', wordBreak: 'break-all' }}>{options}</div>}
        </div>
        {idx !== null && (
          <button 
            onClick={() => handleCopyRule(trimmed, idx)}
            title="Copy Rule"
            style={{ background: 'none', border: 'none', color: copiedLine === idx ? '#4CAF50' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', alignSelf: 'flex-start' }}
          >
            {copiedLine === idx ? '✓ Copied' : '📋'}
          </button>
        )}
      </div>
    );
  };

  const renderYamlLine = (line, idx) => {
    const leadingSpaces = line.length - line.trimStart().length;
    const indent = '\u00A0'.repeat(leadingSpaces);
    const trimmed = line.trim();

    if (!trimmed) return <div key={idx} style={{ height: '1.5rem', display: 'flex' }}><div style={{ width: '40px', textAlign: 'right', userSelect: 'none', paddingRight: '1rem', color: '#858585', opacity: 0.5 }}>{idx + 1}</div></div>;

    if (trimmed.startsWith('#')) {
      return (
        <div key={idx} style={{ display: 'flex', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
          <div style={{ width: '40px', textAlign: 'right', userSelect: 'none', paddingRight: '1rem', opacity: 0.5 }}>{idx + 1}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{indent}{trimmed}</div>
        </div>
      );
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1 && !trimmed.startsWith('-')) {
      const key = line.substring(0, colonIndex + 1);
      let value = line.substring(colonIndex + 1);
      
      let valueColor = '#ffffff'; 
      const trimmedValue = value.trim();
      
      if (trimmedValue.startsWith('"') || trimmedValue.startsWith('[')) valueColor = '#4CAF50'; 
      else if (['yes', 'no', 'true', 'false'].includes(trimmedValue.toLowerCase())) valueColor = '#FF9800'; 
      else if (!isNaN(trimmedValue) && trimmedValue !== '') valueColor = '#E91E63'; 

      return (
        <div key={idx} style={{ display: 'flex', lineHeight: '1.5' }}>
          <div style={{ width: '40px', textAlign: 'right', userSelect: 'none', paddingRight: '1rem', color: '#858585', opacity: 0.5 }}>{idx + 1}</div>
          <div style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {indent}
            <span style={{ color: '#2196F3', fontWeight: 'bold' }}>{key.trim()}</span>
            <span style={{ color: valueColor }}>{value}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={idx} style={{ display: 'flex', lineHeight: '1.5' }}>
        <div style={{ width: '40px', textAlign: 'right', userSelect: 'none', paddingRight: '1rem', color: '#858585', opacity: 0.5 }}>{idx + 1}</div>
        <div style={{ fontFamily: 'monospace', whiteSpace: 'pre', color: '#f0f0f0' }}>{indent}{trimmed}</div>
      </div>
    );
  };


  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, borderBottom: '3px solid var(--accent-color)', paddingBottom: '0.5rem', display: 'inline-block' }}>Suricata Management</h1>
        <button onClick={handleReloadEngine} disabled={isReloading} style={{ padding: '0.75rem 1.5rem', backgroundColor: isReloading ? 'var(--text-secondary)' : '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: isReloading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--card-shadow)', transition: 'background-color 0.2s' }}>
          {isReloading ? '↻ Reloading Engine...' : '🚀 Push Changes to Live'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        {['create', 'upload', 'view'].map(tab => (
           <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.75rem 1.5rem', backgroundColor: activeTab === tab ? 'var(--accent-color)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', textTransform: 'capitalize' }}>
             {tab === 'create' ? 'Create Rules' : tab === 'upload' ? 'Upload & Analyst Rules' : 'View Files'}
           </button>
        ))}
        {isAdmin && (
          <button onClick={() => setActiveTab('config')} style={{ padding: '0.75rem 1.5rem', backgroundColor: activeTab === 'config' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'config' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
            System Config
          </button>
        )}
      </div>

      {/* Messages */}
      {error && <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '4px', border: '1px solid #F44336' }}>⚠️ {error}</div>}
      {success && <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '4px', border: '1px solid #4CAF50' }}>✅ {success}</div>}

      {/* ==================== 1. CREATE TAB ==================== */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
          
          {/* Left Column: Form */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✍️</span>
              <h2 style={{ margin: 0 }}>Rule Composer</h2>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--accent-color)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>Start from a Template (Recommended)</label>
              <select id="template-select" onChange={handleTemplateSelect} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                {RULE_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            <form onSubmit={handleCreateRule}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Rule Description (Name)</label>
                  <input type="text" value={createRuleData.name} onChange={(e) => setCreateRuleData({ ...createRuleData, name: e.target.value })} placeholder="e.g., Detect SQL Injection" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Severity Preset</label>
                  <select value={createRuleData.severity} onChange={(e) => setCreateRuleData({ ...createRuleData, severity: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} >
                    <option value="low">Low (Info)</option>
                    <option value="medium">Medium (Warning)</option>
                    <option value="high">High (Error)</option>
                    <option value="zero_trust">Zero Trust (Critical)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Signature Content</label>
                <textarea 
                  value={createRuleData.content} 
                  onChange={(e) => setCreateRuleData({ ...createRuleData, content: e.target.value })} 
                  rows={7} 
                  style={{ width: '100%', padding: '1rem', fontFamily: 'monospace', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', lineHeight: '1.5' }} 
                  placeholder='alert tcp any any -> any any (msg:"Suspicious Traffic"; sid:10001;)' 
                  required 
                />
              </div>

              <button type="submit" disabled={loading || !createRuleData.content} style={{ width: '100%', padding: '1rem', backgroundColor: loading || !createRuleData.content ? 'var(--text-secondary)' : 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading || !createRuleData.content ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'background-color 0.2s' }}>
                {loading ? 'Committing Rule...' : 'Create & Commit Rule'}
              </button>
            </form>
          </div>

          {/* Right Column: Preview & Help */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👁️</span> Live Syntax Preview
              </h3>
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '6px', minHeight: '100px', display: 'flex', alignItems: 'center', border: '1px dashed var(--border-color)' }}>
                {createRuleData.content ? (
                   <div style={{ width: '100%' }}>{renderRuleLine(createRuleData.content, null)}</div>
                ) : (
                   <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>Start typing to see syntax highlighting...</span>
                )}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', flex: 1 }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Syntax Cheat Sheet</h3>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div>
                   <strong style={{ color: '#F44336' }}>Action</strong> <strong style={{ color: '#2196F3' }}>Protocol</strong> <span style={{ color: 'var(--text-primary)' }}>Source Direction Destination</span> <strong style={{ color: '#FF9800' }}>(Options)</strong>
                 </div>
                 
                 <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '4px' }}>
                   <strong>Actions:</strong> alert, drop, pass, reject<br/><br/>
                   <strong>Protocols:</strong> tcp, udp, icmp, ip, http, tls, smb<br/><br/>
                   <strong>Direction:</strong> -{'>'} (unidirectional), {'<>'} (bidirectional)<br/><br/>
                   <strong>Required Options:</strong><br/>
                   <span style={{ color: '#FF9800' }}>msg:"Description"; sid:1000001; rev:1;</span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== 2. UPLOAD & ANALYST RULES TAB ==================== */}
      {activeTab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Section: Upload Box (Admin Only) */}
          {isAdmin ? (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📦</span>
                <h2 style={{ margin: 0 }}>Bulk Upload Ruleset</h2>
              </div>

              <div style={{ padding: '3rem 2rem', border: `2px dashed ${uploadFile ? '#4CAF50' : 'var(--border-color)'}`, borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: uploadFile ? 'rgba(76, 175, 80, 0.05)' : 'var(--bg-primary)', transition: 'all 0.2s' }}>
                <input type="file" accept=".rules,.txt" onChange={(e) => setUploadFile(e.target.files[0])} style={{ display: 'none' }} id="file-upload" />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{uploadFile ? '📄' : '📥'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: uploadFile ? '#4CAF50' : 'var(--accent-color)' }}>
                    {uploadFile ? `Selected: ${uploadFile.name}` : "Click to Select .rules File"}
                  </div>
                  {!uploadFile && <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Supports standard Suricata .rules files</div>}
                </label>
              </div>

              {uploadFile && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button onClick={() => setUploadFile(null)} style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Cancel</button>
                  <button onClick={handleUpload} disabled={loading} style={{ padding: '0.75rem 2rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {loading ? 'Processing Upload...' : 'Upload & Validate'}
                  </button>
                </div>
              )}

              {uploadResult && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Upload Summary</h3>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ color: '#4CAF50', fontSize: '1.1rem' }}>✔ Successfully Appended: <strong>{uploadResult.processed_count}</strong></div>
                    <div style={{ color: '#F44336', fontSize: '1.1rem' }}>⚠ Skipped/Errors: <strong>{uploadResult.skipped_count || uploadResult.skipped}</strong></div>
                  </div>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: '4px', border: '1px solid rgba(244, 67, 54, 0.3)', maxHeight: '150px', overflowY: 'auto' }}>
                      <strong style={{ color: '#F44336', display: 'block', marginBottom: '0.5rem' }}>Error Logs:</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#F44336', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
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
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📜</span> Analyst Audit History
            </h2>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <tr>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '15%' }}>Timestamp</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '10%' }}>Action</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '10%' }}>Analyst</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Rule Context</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleHistory.map((record, idx) => {
                    const isCreated = record.action === 'created';
                    const actionColor = isCreated ? '#4CAF50' : '#2196F3';
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                          <div>{new Date(record.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.8rem' }}>{new Date(record.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <span style={{ backgroundColor: `${actionColor}20`, color: actionColor, padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', border: `1px solid ${actionColor}50` }}>
                            {record.action}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', verticalAlign: 'top', color: 'var(--text-secondary)' }}>
                          {record.user_id ? record.user_id.substring(0,8) + "..." : 'System'}
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          {record.metadata?.rule_name && (
                            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              📝 {record.metadata.rule_name}
                            </div>
                          )}
                          <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                             {/* Re-use the syntax highlighter for the history table! */}
                             {renderRuleLine(record.rule_content, null)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {ruleHistory.length === 0 && <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No recent rule activities found in the database.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== 3. VIEW TAB ==================== */}
      {activeTab === 'view' && (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
          
          <div style={{ width: '320px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: 0 }}>Search Content</h3>
              <form onSubmit={handleSearch}>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find rule..." style={{ width: '100%', padding: '0.75rem', margin: '0.5rem 0', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Search Files</button>
              </form>
            </div>

            {activeFileMetadata && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Target File:</strong> local.rules</div>
                <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: 'var(--text-primary)' }}>Total Lines:</strong> {activeFileMetadata.line_count}</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>Last Modified:</strong><br/>{new Date(activeFileMetadata.modified).toLocaleString()}</div>
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>File Backups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {backups.map((bk, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)', transition: 'transform 0.1s' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{new Date(bk.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{new Date(bk.created_at).toLocaleTimeString()}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{(bk.size / 1024).toFixed(1)} KB</span>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleViewDiff(bk.filename)} style={{ padding: '4px 8px', backgroundColor: 'var(--text-secondary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Diff</button>
                          <button onClick={() => handleRestore(bk.filename)} style={{ padding: '4px 8px', backgroundColor: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Restore</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {backups.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>No backups found.</p>}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>local.rules Viewer</strong>
              <button onClick={loadFileContent} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 'bold' }}>↻ Refresh Viewer</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
               {loading ? (
                 <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading content from system...</div>
               ) : fileContent && fileContent.length > 0 ? (
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                   {fileContent.map((line, idx) => renderRuleLine(line, idx))}
                 </div>
               ) : (
                 <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>File is empty or no content loaded.</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. SYSTEM CONFIG TAB ==================== */}
      {activeTab === 'config' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
               <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   Pending Changes <span style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px' }}>5</span>
                 </h3>
                 <button style={{ color: '#F44336', background: 'none', border: '1px solid #F44336', borderRadius: '4px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>Discard All</button>
               </div>
               
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead style={{ backgroundColor: 'var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                   <tr>
                     <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem' }}>TYPE</th>
                     <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem' }}>DESCRIPTION</th>
                     <th style={{ textAlign: 'right', padding: '0.75rem 1.5rem' }}>ACTION</th>
                   </tr>
                 </thead>
                 <tbody>
                   {[
                     { type: 'Rule Enabled', desc: 'SID 2100498', color: '#4CAF50' },
                     { type: 'Rule Disabled', desc: 'SID 2013527', color: '#F44336' },
                     { type: 'Rule Modified', desc: 'SID 2025356', color: '#2196F3' },
                     { type: 'Config Changed', desc: 'alert-threshold', color: '#FF9800' },
                     { type: 'Rules Imported', desc: 'custom-rules.txt', color: '#9C27B0' },
                   ].map((change, idx) => (
                     <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                       <td style={{ padding: '1rem 1.5rem' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: change.color, marginRight: '0.5rem' }}></span><span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{change.type}</span></td>
                       <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{change.desc}</td>
                       <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}><button style={{ color: '#F44336', border: 'none', background: 'rgba(244, 67, 54, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Undo</button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--accent-color)', cursor: 'pointer', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>View Full Changelog</div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
               <h3 style={{ margin: '0 0 1rem 0' }}>Apply Configuration</h3>
               <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid rgba(255, 152, 0, 0.3)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                 <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                 <div>
                   <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Deployment Warning</strong>
                   <span style={{ fontSize: '0.9rem' }}>Applying changes will restart the Suricata inspection engine. Expect an estimated downtime of ~15 seconds.</span>
                 </div>
               </div>

               <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" name="apply" style={{ accentColor: 'var(--accent-color)' }} /> <span style={{ fontWeight: 'bold' }}>Apply and Restart Immediately</span></label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}><input type="radio" name="apply" defaultChecked style={{ accentColor: 'var(--accent-color)' }} /> <span style={{ fontWeight: 'bold' }}>Schedule Maintenance Window</span></label>
                 <select style={{ marginLeft: '2rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}>
                   <option>Tonight @ 23:00 Local Time</option>
                 </select>
               </div>

               <div style={{ display: 'flex', gap: '1rem' }}>
                 <button style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--accent-color)', background: 'transparent', color: 'var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Test Configuration</button>
                 <button style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'var(--accent-color)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Commit Changes</button>
               </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚙️</span><strong style={{ fontSize: '1.1rem' }}>suricata.yaml</strong>
              </div>
              <button style={{ padding: '0.4rem 1rem', cursor: 'pointer', background: 'transparent', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>Edit Config</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem 0' }}>
               {MOCK_YAML_LINES.map((line, idx) => renderYamlLine(line, idx))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== DIFF MODAL ==================== */}
      {diffModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', width: '90%', height: '90%', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Diff View: {diffData.backupId} vs Current</h2>
              <button onClick={() => setDiffModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#F44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Modal</button>
            </div>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', textAlign: 'center', fontWeight: 'bold', color: '#FF9800' }}>Backup File</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {diffData.backupContent.map((line, i) => {
                    const existsInCurrent = diffData.currentContent.includes(line);
                    return <div key={i} style={{ backgroundColor: existsInCurrent ? 'transparent' : 'rgba(244, 67, 54, 0.2)', color: existsInCurrent ? 'var(--text-primary)' : '#ff8a80' }}>{line}</div>
                  })}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', textAlign: 'center', fontWeight: 'bold', color: '#4CAF50' }}>Current File</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {diffData.currentContent.map((line, i) => {
                    const existsInBackup = diffData.backupContent.includes(line);
                    return <div key={i} style={{ backgroundColor: existsInBackup ? 'transparent' : 'rgba(76, 175, 80, 0.2)', color: existsInBackup ? 'var(--text-primary)' : '#b9f6ca' }}>{line}</div>
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => setDiffModalOpen(false)} style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                {isAdmin && <button onClick={() => handleRestore(diffData.backupId)} style={{ padding: '0.75rem 1.5rem', background: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Restore This Backup</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuricataRules;