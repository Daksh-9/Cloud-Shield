import React, { useState } from 'react';

function ManageAnalysts() {
  // Mock data for analysts
  const [analysts, setAnalysts] = useState([
    { id: 1, name: 'Alex Security', email: 'alex.s@cloudshield.local', role: 'Analyst', status: 'Active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Jordan Rivera', email: 'jordan.r@cloudshield.local', role: 'Senior Analyst', status: 'Active', lastLogin: '1 day ago' },
    { id: 3, name: 'Casey Smith', email: 'casey.s@cloudshield.local', role: 'Analyst', status: 'Suspended', lastLogin: '2 weeks ago' },
  ]);

  // Mock data for Activity Logs (Audit Trail)
  const [activityLogs, setActivityLogs] = useState([
    { id: 101, analystId: 1, type: 'login', action: 'System Login', timestamp: 'Today, 08:00 AM', details: 'IP: 192.168.1.50' },
    { id: 102, analystId: 1, type: 'acknowledge', action: 'Acknowledged Alert', timestamp: 'Today, 08:15 AM', details: 'Alert ID: #45 - SYN Flood Detected' },
    { id: 103, analystId: 1, type: 'resolve', action: 'Resolved Alert', timestamp: 'Today, 08:45 AM', details: 'Alert ID: #45 - Applied IP Block' },
    { id: 104, analystId: 1, type: 'logout', action: 'System Logout', timestamp: 'Today, 12:00 PM', details: 'Session duration: 4h 0m' },
    
    { id: 201, analystId: 2, type: 'login', action: 'System Login', timestamp: 'Yesterday, 09:00 AM', details: 'IP: 192.168.1.62' },
    { id: 202, analystId: 2, type: 'system', action: 'Updated Suricata Rule', timestamp: 'Yesterday, 10:30 AM', details: 'Rule SID: 2001234' },
    { id: 203, analystId: 2, type: 'acknowledge', action: 'Acknowledged Alert', timestamp: 'Yesterday, 11:15 AM', details: 'Alert ID: #12 - UDP Amplification' },
  ]);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({ name: '', email: '', role: 'Analyst' });
  
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);

  // --- Handlers ---
  const handleToggleStatus = (id) => {
    setAnalysts(analysts.map(analyst => {
      if (analyst.id === id) {
        return { ...analyst, status: analyst.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return analyst;
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this analyst? This action cannot be undone.')) {
      setAnalysts(analysts.filter(a => a.id !== id));
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAnalyst.name || !newAnalyst.email) return;

    const newId = analysts.length > 0 ? Math.max(...analysts.map(a => a.id)) + 1 : 1;
    setAnalysts([...analysts, { 
      id: newId, 
      ...newAnalyst, 
      status: 'Active', 
      lastLogin: 'Never' 
    }]);
    
    setNewAnalyst({ name: '', email: '', role: 'Analyst' });
    setShowAddModal(false);
  };

  const openActivityLog = (analyst) => {
    setSelectedAnalyst(analyst);
    setShowActivityModal(true);
  };

  // Utility to style log types
  const getLogStyle = (type) => {
    const styles = {
      login: { color: '#10b981', icon: '🟢' },
      logout: { color: 'var(--text-secondary)', icon: '⭕' },
      acknowledge: { color: 'var(--accent-color)', icon: '👀' },
      resolve: { color: '#f59e0b', icon: '✅' },
      system: { color: '#8b5cf6', icon: '⚙️' }
    };
    return styles[type] || { color: 'var(--text-secondary)', icon: '📝' };
  };

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
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-primary)', verticalAlign: 'middle' }}>{analyst.name}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>{analyst.email}</td>
                <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                  <span style={{ 
                    display: 'inline-block', // This fixes the vertical stretch issue
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    color: 'var(--accent-color)', 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '15px', 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    lineHeight: '1'
                  }}>
                    {analyst.role}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: analyst.status === 'Active' ? '#10b981' : '#ef4444',
                      marginRight: '0.5rem',
                      boxShadow: `0 0 4px ${analyst.status === 'Active' ? '#10b981' : '#ef4444'}`
                    }}></span>
                    <span style={{ color: analyst.status === 'Active' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{analyst.status}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', verticalAlign: 'middle' }}>{analyst.lastLogin}</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', verticalAlign: 'middle' }}>
                  <button 
                    onClick={() => openActivityLog(analyst)}
                    style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent-color)', fontWeight: '500' }}>
                    View Activity
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(analyst.id)}
                    style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {analyst.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDelete(analyst.id)}
                    style={{ padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}>
                    Remove
                  </button>
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

      {/* --- View Activity Modal --- */}
      {showActivityModal && selectedAnalyst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Activity Log: {selectedAnalyst.name}</h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedAnalyst.role} • {selectedAnalyst.email}</span>
              </div>
              <button onClick={() => setShowActivityModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>

            {/* Scrollable Timeline */}
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '1rem' }}>
              {activityLogs.filter(log => log.analystId === selectedAnalyst.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No recent activity found for this user.</div>
              ) : (
                <div style={{ position: 'relative', borderLeft: '2px solid var(--border-color)', marginLeft: '1rem', paddingBottom: '1rem' }}>
                  {activityLogs.filter(log => log.analystId === selectedAnalyst.id).map((log, index) => {
                    const style = getLogStyle(log.type);
                    return (
                      <div key={log.id} style={{ position: 'relative', paddingLeft: '2rem', marginBottom: '1.5rem', marginTop: index === 0 ? '1rem' : '0' }}>
                        {/* Timeline Dot */}
                        <div style={{ position: 'absolute', left: '-12px', top: '0', fontSize: '1.2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '50%' }}>
                          {style.icon}
                        </div>
                        
                        {/* Log Content */}
                        <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: style.color }}>{log.action}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.timestamp}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{log.details}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => window.alert('Exporting CSV...')} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '4px', cursor: 'pointer' }}>Export Log (CSV)</button>
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Role</label>
                <select value={newAnalyst.role} onChange={(e) => setNewAnalyst({...newAnalyst, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <option value="Analyst">Analyst</option>
                  <option value="Senior Analyst">Senior Analyst</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageAnalysts;