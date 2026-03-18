import React, { useState, useEffect, useMemo } from 'react';
import { userService } from '../services/user';
import { authService } from '../services/auth';

function ManageAnalysts() {
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({ name: '', email: '', role: 'analyst', password: '' });
  const [saving, setSaving] = useState(false);
  
  // Activity Log State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);

  // --- Initialization ---
  useEffect(() => {
    loadAnalysts();
  }, []);

  const loadAnalysts = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setAnalysts(data);
    } catch (error) {
      console.error("Failed to load users", error);
      setMessage({ type: 'error', text: 'Failed to load the analysts database.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Derived State (KPIs & Filtering) ---
  const filteredAnalysts = useMemo(() => {
    if (!searchQuery) return analysts;
    const lowerQuery = searchQuery.toLowerCase();
    return analysts.filter(a => 
      (a.full_name && a.full_name.toLowerCase().includes(lowerQuery)) || 
      (a.email && a.email.toLowerCase().includes(lowerQuery))
    );
  }, [analysts, searchQuery]);

  const kpis = useMemo(() => {
    return {
      total: analysts.length,
      active: analysts.filter(a => a.is_active).length,
      suspended: analysts.filter(a => !a.is_active).length,
      admins: analysts.filter(a => a.role === 'admin').length
    };
  }, [analysts]);

  // --- Handlers ---
  const handleToggleStatus = async (analyst) => {
    try {
      if (analyst.is_active) {
        await userService.deactivateUser(analyst.id);
        setMessage({ type: 'success', text: `User ${analyst.email} suspended.` });
      } else {
        await userService.reactivateUser(analyst.id);
        setMessage({ type: 'success', text: `User ${analyst.email} activated.` });
      }
      loadAnalysts(); 
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update user status.' });
    }
  };

  const handleDelete = () => {
    window.alert("To maintain security audit trails, SOC analysts cannot be hard-deleted. Please use the 'Suspend' action to revoke their access.");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await authService.register(
        newAnalyst.email, 
        newAnalyst.password, 
        newAnalyst.name, 
        newAnalyst.role
      );
      
      setMessage({ type: 'success', text: 'New analyst account created successfully.' });
      setNewAnalyst({ name: '', email: '', role: 'analyst', password: '' });
      setShowAddModal(false);
      loadAnalysts(); 
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create account.' });
    } finally {
      setSaving(false);
    }
  };

  const openActivityLog = (analyst) => {
    setSelectedAnalyst(analyst);
    setShowActivityModal(true);
  };

  // --- UI Helpers ---
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    const isSysAdmin = role === 'admin';
    return (
      <span style={{ 
        display: 'inline-block',
        backgroundColor: isSysAdmin ? 'rgba(156, 39, 176, 0.15)' : 'rgba(33, 150, 243, 0.15)', 
        color: isSysAdmin ? '#9C27B0' : '#2196F3', 
        padding: '4px 10px', 
        borderRadius: '4px', 
        fontSize: '0.75rem', 
        fontWeight: 'bold', 
        border: `1px solid ${isSysAdmin ? 'rgba(156, 39, 176, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
        textTransform: 'uppercase'
      }}>
        {role}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>👥</span> Analyst Directory
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Manage SOC personnel, access roles, and audit trails</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--card-shadow)', transition: 'background-color 0.2s' }}>
          <span>➕</span> Provision New Analyst
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Personnel', count: kpis.total, color: '#2196F3' },
          { label: 'Active Sessions', count: kpis.active, color: '#4CAF50' },
          { label: 'System Admins', count: kpis.admins, color: '#9C27B0' },
          { label: 'Suspended Accounts', count: kpis.suspended, color: '#F44336' },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', borderTop: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>{stat.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
              {loading ? '...' : stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* Global Notifications */}
      {message.text && (
        <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: message.type === 'success' ? '#4CAF50' : '#F44336', borderRadius: '4px', border: `1px solid ${message.type === 'success' ? '#4CAF50' : '#F44336'}` }}>
          {message.type === 'success' ? '✅ ' : '⚠️ '} {message.text}
        </div>
      )}

      {/* Table Controls (Search) */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '8px 8px 0 0', border: '1px solid var(--border-color)', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '300px' }}>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Showing {filteredAnalysts.length} of {analysts.length} analysts
        </div>
      </div>

      {/* Analysts Table */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 8px 8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            
            <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' }}>Personnel Name</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' }}>Email Contact</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' }}>Security Role</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' }}>Last Login</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Retrieving personnel records...</td></tr>
              ) : filteredAnalysts.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No personnel matching your criteria.</td></tr>
              ) : (
                filteredAnalysts.map((analyst, idx) => (
                  <tr key={analyst.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{analyst.full_name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{analyst.email}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{getRoleBadge(analyst.role)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: analyst.is_active ? '#4CAF50' : '#F44336' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: analyst.is_active ? '#4CAF50' : '#F44336', animation: analyst.is_active ? 'pulse 2s infinite' : 'none' }}></span>
                        {analyst.is_active ? 'Active' : 'Suspended'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDate(analyst.last_login)}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button onClick={() => openActivityLog(analyst)} style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                        Audit Log
                      </button>
                      
                      {analyst.id !== authService.getStoredUser()?.id && (
                        <>
                          <button onClick={() => handleToggleStatus(analyst)} style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: analyst.is_active ? '#FF9800' : '#4CAF50' }}>
                            {analyst.is_active ? 'Suspend' : 'Restore'}
                          </button>
                          <button onClick={handleDelete} style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '4px', cursor: 'pointer', color: '#F44336' }}>
                            Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Add Analyst Modal --- */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '8px', width: '100%', maxWidth: '450px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span>🔐</span> Provision Account</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Create a new access profile for a SOC analyst.</p>
            
            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" value={newAnalyst.name} onChange={(e) => setNewAnalyst({...newAnalyst, name: e.target.value})} required style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} placeholder="e.g. Jane Doe" />
              </div>
              
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Email Address</label>
                <input type="email" value={newAnalyst.email} onChange={(e) => setNewAnalyst({...newAnalyst, email: e.target.value})} required style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} placeholder="analyst@cloudshield.local" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Temp Password</label>
                  <input type="password" value={newAnalyst.password} onChange={(e) => setNewAnalyst({...newAnalyst, password: e.target.value})} minLength={8} required style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} placeholder="Min 8 chars" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Security Role</label>
                  <select value={newAnalyst.role} onChange={(e) => setNewAnalyst({...newAnalyst, role: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                    <option value="analyst">Analyst</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.8rem', backgroundColor: 'var(--accent-color)', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 'bold' }}>
                  {saving ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- View Activity Modal (Secure Terminal Mockup) --- */}
      {showActivityModal && selectedAnalyst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#1e1e1e', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--card-shadow)', border: '1px solid #333' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: '#d4d4d4', fontFamily: 'monospace' }}>&gt; AUDIT_QUERY: {selectedAnalyst.id}</h2>
                <span style={{ fontSize: '0.9rem', color: '#4CAF50', fontFamily: 'monospace' }}>TARGET: {selectedAnalyst.email}</span>
              </div>
            </div>

            <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#121212', borderRadius: '4px', border: '1px solid #333' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#F44336', fontFamily: 'monospace', textTransform: 'uppercase' }}>Access Denied: Level 4 Required</h3>
                <p style={{ margin: 0, color: '#888', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  Detailed lateral activity logs are isolated. Please utilize the CLI tool `cloud-shield-audit` on the master node to extract session histories for this UID.
                </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowActivityModal(false)} style={{ padding: '0.5rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', color: '#ccc', fontFamily: 'monospace' }}>EXIT_TERMINAL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageAnalysts;