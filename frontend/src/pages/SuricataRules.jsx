import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suricataService } from '../services/suricata';
import { authService } from '../services/auth';

const SuricataRules = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Rules Tab State
  const [createRuleData, setCreateRuleData] = useState({
    content: '',
    name: ''
  });
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Update Rules Tab State
  const [recentRules, setRecentRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [editContent, setEditContent] = useState('');

  // View Files Tab State
  const [fileContent, setFileContent] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (activeTab === 'update') {
      loadRecentRules();
    } else if (activeTab === 'view') {
      loadFileContent();
    }
  }, [navigate, activeTab]);

  const loadRecentRules = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await suricataService.getRecentRules(5);
      setRecentRules(data.rules || []);
    } catch (err) {
      setError('Failed to load recent rules.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await suricataService.viewRulesFile(searchQuery || undefined, caseSensitive);
      if (data.rules) {
        // Search results
        setSearchResults(data.rules);
        setFileContent(null);
      } else {
        // Full file content
        setFileContent(data.lines || []);
        setFileMetadata(data.metadata || {});
        setSearchResults(null);
      }
    } catch (err) {
      setError('Failed to load rules file.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateRule = useCallback((ruleContent) => {
    const errors = [];
    const warnings = [];

    if (!ruleContent || !ruleContent.trim()) {
      errors.push('Rule cannot be empty');
      return { errors, warnings };
    }

    const rule = ruleContent.trim();

    // Basic format checks
    if (!rule.includes('->') && !rule.includes('<>')) {
      errors.push('Rule must contain direction arrow (-> or <>)');
    }

    if (rule.split(' ').length < 7) {
      warnings.push('Rule format may be incomplete');
    }

    // Check for balanced parentheses
    if (rule.split('(').length !== rule.split(')').length) {
      errors.push('Unbalanced parentheses');
    }

    // Check for SID
    if (!rule.toLowerCase().includes('sid:')) {
      warnings.push('Rule should include a SID (sid:) for identification');
    }

    // Check for message
    if (!rule.toLowerCase().includes('msg:')) {
      warnings.push('Rule should include a message (msg:) for clarity');
    }

    return { errors, warnings };
  }, []);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors([]);
    setValidationWarnings([]);

    // Validate
    const { errors, warnings } = validateRule(createRuleData.content);
    setValidationErrors(errors);
    setValidationWarnings(warnings);

    if (errors.length > 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await suricataService.createRule(
        createRuleData.content,
        createRuleData.name || undefined
      );

      setSuccess(`Rule created successfully at line ${result.line_number}`);
      if (result.warnings && result.warnings.length > 0) {
        setValidationWarnings(result.warnings);
      }

      // Clear form
      setCreateRuleData({ content: '', name: '' });

      // Reload recent rules if on that tab
      if (activeTab === 'update') {
        setTimeout(loadRecentRules, 500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (rule) => {
    setEditingRule(rule);
    setEditContent(rule.content);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setEditContent('');
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    setError('');
    setSuccess('');

    // Validate
    const { errors, warnings } = validateRule(editContent);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setLoading(true);
    try {
      const result = await suricataService.updateRule(
        editingRule.line_number,
        editContent
      );

      setSuccess(`Rule updated successfully at line ${result.line_number}`);
      setEditingRule(null);
      setEditContent('');
      await loadRecentRules();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update rule.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadFileContent();
  };

  const handleDownload = async () => {
    try {
      const blob = await suricataService.downloadRulesFile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'suricata_rules.rules';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Rules file downloaded successfully');
    } catch (err) {
      setError('Failed to download rules file.');
    }
  };

  const formatLineNumber = (num) => {
    return String(num).padStart(4, '0');
  };

  return (
    <div style={{ 
      padding: 'clamp(1rem, 2vw, 2rem)', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        marginBottom: '1.5rem',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: '700',
        color: '#1a1a1a',
        borderBottom: '3px solid #2196F3',
        paddingBottom: '0.5rem',
        display: 'inline-block'
      }}>
        Suricata Rules Management
      </h1>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem', 
        borderBottom: '2px solid #ddd', 
        flexWrap: 'wrap' 
      }}>
        {[
          { id: 'create', label: 'Create Rules' },
          { id: 'update', label: 'Update Rules' },
          { id: 'view', label: 'View Files' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab.id ? '#2196F3' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2196F3' : 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '-2px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#2196F3';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#666';
              }
            }}
            aria-label={`${tab.label} tab`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          border: '1px solid #ef5350',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '8px',
          border: '1px solid #66bb6a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Create Rules Tab */}
      {activeTab === 'create' && (
        <div style={{
          backgroundColor: '#fff',
          padding: 'clamp(1rem, 2vw, 2rem)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ 
            marginBottom: '1.5rem',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#333'
          }}>
            Create New Rule
          </h2>

          <form onSubmit={handleCreateRule}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#333', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Rule Name (Optional)
              </label>
              <input
                type="text"
                value={createRuleData.name}
                onChange={(e) => setCreateRuleData({ ...createRuleData, name: e.target.value })}
                placeholder="e.g., Custom DDoS Detection Rule"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2196F3'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#333', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Rule Content <span style={{ color: '#f44336' }}>*</span>
              </label>
              <textarea
                value={createRuleData.content}
                onChange={(e) => {
                  setCreateRuleData({ ...createRuleData, content: e.target.value });
                  // Real-time validation
                  const { errors, warnings } = validateRule(e.target.value);
                  setValidationErrors(errors);
                  setValidationWarnings(warnings);
                }}
                required
                rows={8}
                placeholder="alert tcp any any -> any any (msg:\"Test Rule\"; sid:1000001;)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: validationErrors.length > 0 ? '2px solid #f44336' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  if (validationErrors.length === 0) {
                    e.currentTarget.style.borderColor = '#2196F3';
                  }
                }}
                onBlur={(e) => {
                  if (validationErrors.length === 0) {
                    e.currentTarget.style.borderColor = '#ddd';
                  }
                }}
                aria-label="Rule content textarea"
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                Example: alert tcp any any -> any any (msg:"Test Rule"; sid:1000001;)
              </div>
            </div>

            {/* Validation Messages */}
            {validationErrors.length > 0 && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#ffebee',
                borderRadius: '6px',
                border: '1px solid #ef5350'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#c62828' }}>
                  Errors:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#c62828' }}>
                  {validationErrors.map((err, idx) => (
                    <li key={idx} style={{ fontSize: '0.875rem' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationWarnings.length > 0 && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                border: '1px solid #ffb74d'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#e65100' }}>
                  Warnings:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#e65100' }}>
                  {validationWarnings.map((warn, idx) => (
                    <li key={idx} style={{ fontSize: '0.875rem' }}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={loading || validationErrors.length > 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading || validationErrors.length > 0 ? '#ccc' : '#2196F3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || validationErrors.length > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading && validationErrors.length === 0) {
                    e.currentTarget.style.backgroundColor = '#1976D2';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && validationErrors.length === 0) {
                    e.currentTarget.style.backgroundColor = '#2196F3';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                aria-label="Create rule button"
              >
                {loading ? 'Creating...' : 'Create Rule'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateRuleData({ content: '', name: '' });
                  setValidationErrors([]);
                  setValidationWarnings([]);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#999';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.color = '#666';
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Update Rules Tab */}
      {activeTab === 'update' && (
        <div style={{
          backgroundColor: '#fff',
          padding: 'clamp(1rem, 2vw, 2rem)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
              fontWeight: '600',
              color: '#333'
            }}>
              Update Rules (Last 5)
            </h2>
            <button
              onClick={loadRecentRules}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading && recentRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading rules...</p>
            </div>
          ) : recentRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
              <p>No rules found. Create your first rule in the Create Rules tab.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentRules.map((rule, idx) => (
                <div
                  key={rule.line_number || idx}
                  style={{
                    padding: '1rem',
                    border: editingRule?.line_number === rule.line_number ? '2px solid #2196F3' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: editingRule?.line_number === rule.line_number ? '#f5f9ff' : '#fafafa',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {editingRule?.line_number === rule.line_number ? (
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                          Line {rule.line_number}
                          {rule.comment && (
                            <span style={{ marginLeft: '1rem', fontStyle: 'italic' }}>
                              {rule.comment}
                            </span>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          marginBottom: '0.75rem',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleUpdateRule}
                          disabled={loading}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#4CAF50',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'transparent',
                            color: '#666',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#666', 
                            marginBottom: '0.25rem',
                            fontWeight: '500'
                          }}>
                            Line {rule.line_number}
                            {rule.sid && (
                              <span style={{ marginLeft: '1rem' }}>SID: {rule.sid}</span>
                            )}
                          </div>
                          {rule.comment && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#999', 
                              fontStyle: 'italic',
                              marginBottom: '0.25rem'
                            }}>
                              {rule.comment}
                            </div>
                          )}
                          <pre style={{
                            margin: 0,
                            padding: '0.5rem',
                            backgroundColor: '#fff',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            overflowX: 'auto',
                            border: '1px solid #e0e0e0'
                          }}>
                            {rule.content}
                          </pre>
                        </div>
                        <button
                          onClick={() => handleStartEdit(rule)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2196F3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1976D2';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#2196F3';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Files Tab */}
      {activeTab === 'view' && (
        <div style={{
          backgroundColor: '#fff',
          padding: 'clamp(1rem, 2vw, 2rem)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
              fontWeight: '600',
              color: '#333'
            }}>
              View Rules File
            </h2>
            <button
              onClick={handleDownload}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#45a049';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4CAF50';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Download File
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search rules..."
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            />
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#666'
            }}>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Case sensitive
            </label>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              Search
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                  loadFileContent();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* File Metadata */}
          {fileMetadata && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#666'
            }}>
              <strong>File Info:</strong> {fileMetadata.line_count} lines
              {fileMetadata.modified && (
                <span style={{ marginLeft: '1rem' }}>
                  Last modified: {new Date(fileMetadata.modified).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Content Display */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading file...</p>
            </div>
          ) : searchResults ? (
            <div>
              <div style={{ 
                marginBottom: '1rem', 
                fontSize: '0.875rem', 
                color: '#666' 
              }}>
                Found {searchResults.length} matching rule(s)
              </div>
              <div style={{
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                overflow: 'auto',
                maxHeight: '600px',
                backgroundColor: '#fafafa'
              }}>
                {searchResults.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderBottom: idx < searchResults.length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      minWidth: '60px',
                      fontSize: '0.75rem',
                      color: '#999',
                      fontWeight: '600',
                      paddingTop: '0.25rem'
                    }}>
                      {formatLineNumber(rule.line_number)}
                    </div>
                    <pre style={{
                      margin: 0,
                      flex: 1,
                      fontSize: '0.8rem',
                      overflowX: 'auto'
                    }}>
                      {rule.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ) : fileContent ? (
            <div style={{
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              overflow: 'auto',
              maxHeight: '600px',
              backgroundColor: '#fafafa'
            }}>
              {fileContent.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.25rem 0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{
                    minWidth: '60px',
                    color: '#999',
                    fontWeight: '600',
                    textAlign: 'right',
                    userSelect: 'none'
                  }}>
                    {formatLineNumber(idx + 1)}
                  </div>
                  <div style={{
                    flex: 1,
                    color: line.trim().startsWith('#') ? '#999' : '#333',
                    fontStyle: line.trim().startsWith('#') ? 'italic' : 'normal',
                    whiteSpace: 'pre',
                    overflowX: 'auto'
                  }}>
                    {line}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
              <p>No file content to display</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuricataRules;
