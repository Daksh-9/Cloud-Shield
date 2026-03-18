import React, { useState, useEffect } from 'react';
import { userService } from '../services/user';
import { authService } from '../services/auth';

function ManageAnalysts() {
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({ name: '', email: '', role: 'analyst', password: '' });
  const [saving, setSaving] = useState(false);
  
  // Activity Log State (Currently a placeholder until Admin Audit backend route is built)
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

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
      loadAnalysts(); // Refresh the table
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
      // Use authService to register the new user on the backend
      await authService.register(
        newAnalyst.email, 
        newAnalyst.password, 
        newAnalyst.name, 
        newAnalyst.role
      );
      
      setMessage({ type: 'success', text: 'New analyst account created successfully.' });
      setNewAnalyst({ name: '', email: '', role: 'analyst', password: '' });
      setShowAddModal(false);
      loadAnalysts(); // Refresh the list
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create account.' });
    } finally {
      setSaving(false);
    }
  };

  const openActivityLog = (analyst) => {
    setSelectedAnalyst(analyst);
    setActivityLogs([]); // Cleared because backend doesn't support admin viewing *other* users' logs yet
    setShowActivityModal(true);
  };

  // Utility to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Loading Analyst Database...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', color: 'var(--text-primary)' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Manage Analysts</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Add, remove, and monitor activity for SOC analysts.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }}>
          <span>➕</span> Add New Analyst
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '6px',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Analysts Table */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', border: '1px solid var(--border-color)', width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', verticalAlign: 'middle' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', verticalAlign: 'middle' }}>Email</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', verticalAlign: 'middle' }}>Role</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', verticalAlign: 'middle' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', verticalAlign: 'middle' }}>Last Login</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right', verticalAlign: 'middle' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {analysts.map((analyst) => (
              <tr key={analyst.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-primary)', verticalAlign: 'middle' }}>{analyst.full_name}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>{analyst.email}</td>
                <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                  <span style={{ 
                    display: 'inline-block',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    color: 'var(--accent-color)', 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '15px', 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    lineHeight: '1',
                    textTransform: 'capitalize'
                  }}>
                    {analyst.role}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: analyst.is_active ? '#10b981' : '#ef4444',
                      marginRight: '0.5rem',
                      boxShadow: `0 0 4px ${analyst.is_active ? '#10b981' : '#ef4444'}`
                    }}></span>
                    <span style={{ color: analyst.is_active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {analyst.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', verticalAlign: 'middle' }}>
                  {formatDate(analyst.last_login)}
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', verticalAlign: 'middle' }}>
                  <button 
                    onClick={() => openActivityLog(analyst)}
                    style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent-color)', fontWeight: '500' }}>
                    Audit Logs
                  </button>
                  {analyst.id !== authService.getStoredUser()?.id && (
                    <>
                      <button 
                        onClick={() => handleToggleStatus(analyst)}
                        style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {analyst.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button 
                        onClick={() => handleDelete(analyst.id)}
                        style={{ padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}>
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {analysts.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>No analysts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- View Activity Modal (Placeholder) --- */}
      {showActivityModal && selectedAnalyst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Activity Audit: {selectedAnalyst.full_name}</h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{selectedAnalyst.role} • {selectedAnalyst.email}</span>
              </div>
              <button onClick={() => setShowActivityModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '1rem', paddingBottom: '1.5rem' }}>
               <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Audit Logs Restricted</h3>
                  <p style={{ margin: 0 }}>Detailed activity audit logs for specific analysts are only available through backend administrative queries at this time.</p>
               </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowActivityModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Analyst Modal --- */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Add New Analyst</h2>
            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" value={newAnalyst.name} onChange={(e) => setNewAnalyst({...newAnalyst, name: e.target.value})} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="e.g. Jane Doe" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Email Address</label>
                <input type="email" value={newAnalyst.email} onChange={(e) => setNewAnalyst({...newAnalyst, email: e.target.value})} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="jane@cloudshield.local" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Temporary Password</label>
                <input type="password" value={newAnalyst.password} onChange={(e) => setNewAnalyst({...newAnalyst, password: e.target.value})} minLength={8} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="Minimum 8 characters" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Role</label>
                <select value={newAnalyst.role} onChange={(e) => setNewAnalyst({...newAnalyst, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <option value="analyst">Analyst</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 'bold' }}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageAnalysts;