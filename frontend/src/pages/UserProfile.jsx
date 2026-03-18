import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/user';
import { authService } from '../services/auth';

const UserProfile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // --- STATE ---
  
  // Profile
  const [profile, setProfile] = useState({ 
    full_name: '', email: '', role: '', phone: '', department: '', created_at: null, updated_at: null
  });
  
  // Settings (Preferences, Notifications, Dashboard)
  const [settings, setSettings] = useState(null);
  
  // Security
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [sessions, setSessions] = useState([]);
  
  // Activity Log
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Admin: Manage Analysts
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // --- EFFECTS ---

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadInitialData();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'activity log' && activities.length === 0) {
      loadActivities();
    } else if (activeTab === 'system admin' && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [activeTab]);

  // --- DATA LOADING ---

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const profileData = await userService.getProfile();
      setProfile({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        role: profileData.role || 'analyst',
        phone: profileData.phone || '',
        department: profileData.department || '',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      });

      try {
        const settingsData = await userService.getSettings();
        setSettings(settingsData);
      } catch (err) { console.warn("Could not load settings:", err); }

      try {
        const sessionsData = await userService.getSessions();
        setSessions(sessionsData);
      } catch (err) { console.warn("Could not load sessions:", err); }

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load user data. Please try refreshing.' });
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    setActivitiesLoading(true);
    try {
      const data = await userService.getActivities({ limit: 50 });
      setActivities(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load activity log.' });
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadAllUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await userService.getAllUsers();
      setAllUsers(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load system users. Admin privileges required.' });
    } finally {
      setUsersLoading(false);
    }
  };

  // --- HANDLERS: PROFILE & PREFERENCES ---

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await userService.updateProfile({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        department: profile.department
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setProfile(prev => ({ ...prev, updated_at: new Date().toISOString() }));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = async (section, key, value) => {
    if (!settings) return;

    const updatedSectionData = { ...settings[section], [key]: value };
    setSettings({ ...settings, [section]: updatedSectionData });

    try {
      const payload = {};
      payload[section] = updatedSectionData;
      await userService.updateSettings(payload);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preference.' });
      setSettings({ ...settings, [section]: { ...settings[section], [key]: settings[section][key] } });
    }
  };

  // --- HANDLERS: SECURITY & SESSIONS ---

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setSaving(true);
    try {
      await userService.changePassword(passwordData.current_password, passwordData.new_password);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) return;
    try {
      await userService.revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      setMessage({ type: 'success', text: 'Session revoked successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revoke session.' });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Revoke all other sessions? You will remain logged in here.')) return;
    try {
      await userService.revokeAllSessions();
      const updatedSessions = await userService.getSessions();
      setSessions(updatedSessions);
      setMessage({ type: 'success', text: 'All other sessions revoked.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revoke sessions.' });
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.prompt('Type "DELETE" to confirm account deletion:');
    if (confirm1 !== 'DELETE') return;

    const confirm2 = window.confirm('This action CANNOT be undone. Are you absolutely sure?');
    if (!confirm2) return;

    try {
      await userService.deleteAccount();
      authService.logout();
      navigate('/login');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete account.' });
    }
  };

  // --- HANDLERS: ADMIN ---

  const handleToggleUserStatus = async (user) => {
    try {
      if (user.is_active) {
        await userService.deactivateUser(user.id);
        setMessage({ type: 'success', text: `User ${user.email} deactivated.` });
      } else {
        await userService.reactivateUser(user.id);
        setMessage({ type: 'success', text: `User ${user.email} reactivated.` });
      }
      loadAllUsers(); 
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Action failed.' });
    }
  };

  // --- UTILS ---

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- RENDER ---

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading profile securely...</div>;

  const tabs = ['Profile', 'Security', 'Preferences', 'Notifications', 'Activity Log'];
  if (profile.role === 'admin') tabs.push('System Admin');

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>👤</span> User Profile & Settings
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Manage your account, security, and preferences</p>
        </div>
      </div>

      {/* Global Notifications */}
      {message.text && (
        <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: message.type === 'success' ? '#4CAF50' : '#F44336', borderRadius: '4px', border: `1px solid ${message.type === 'success' ? '#4CAF50' : '#F44336'}` }}>
          {message.type === 'success' ? '✅ ' : '⚠️ '} {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '2px solid var(--border-color)' }}>
        {tabs.map((tab) => {
          const tabKey = tab.toLowerCase();
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tabKey); setMessage({ type: '', text: '' }); }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                marginBottom: '-2px' // Overlap border
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* ===================== LEFT COLUMN: DYNAMIC CONTENT ===================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Profile Information</h2>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '1px solid var(--border-color)' }}>
                  🧑‍💻
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <div style={{ marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>{profile.email}</div>
                   <div>
                     <span style={{ backgroundColor: profile.role === 'admin' ? 'rgba(156, 39, 176, 0.15)' : 'rgba(33, 150, 243, 0.15)', color: profile.role === 'admin' ? '#9C27B0' : '#2196F3', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold', border: `1px solid ${profile.role === 'admin' ? 'rgba(156, 39, 176, 0.3)' : 'rgba(33, 150, 243, 0.3)'}` }}>
                       {profile.role}
                     </span>
                   </div>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gap: '1.2rem', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Full Name</label>
                  <input type="text" value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} required style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Phone Number</label>
                  <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} placeholder="+1 (555) 000-0000" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Department</label>
                  <input type="text" value={profile.department} onChange={(e) => setProfile({...profile, department: e.target.value})} placeholder="e.g. Security Operations" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" disabled={saving} style={{ padding: '0.8rem 2rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB (Password, Sessions, Danger Zone) */}
          {activeTab === 'security' && (
            <>
              {/* Password Reset */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Change Password</h2>
                <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '1.2rem', maxWidth: '500px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Current Password</label>
                    <input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} required style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>New Password</label>
                    <input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required minLength={8} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} placeholder="Minimum 8 characters" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Confirm New Password</label>
                    <input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} required minLength={8} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <button type="submit" disabled={saving} style={{ padding: '0.8rem 2rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Active Sessions</h2>
                  {sessions.length > 1 && (
                    <button onClick={handleRevokeAllSessions} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'transparent', color: '#FF9800', border: '1px solid #FF9800', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Revoke All Other Sessions
                    </button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No active sessions found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sessions.map((session) => (
                      <div key={session.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{session.ip_address || 'Unknown IP'}</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{session.user_agent || 'Unknown Device'}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginTop: '0.4rem' }}>Started: {formatDate(session.created_at)}</div>
                        </div>
                        <button onClick={() => handleRevokeSession(session.id)} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div style={{ backgroundColor: 'rgba(244, 67, 54, 0.05)', padding: '2rem', borderRadius: '8px', border: '2px solid rgba(244, 67, 54, 0.5)' }}>
                <h2 style={{ margin: '0 0 1rem 0', color: '#F44336' }}>Danger Zone</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Once you delete your account, there is no going back. Please be certain.</p>
                <button onClick={handleDeleteAccount} style={{ padding: '0.8rem 2rem', backgroundColor: '#F44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                  Delete My Account
                </button>
              </div>
            </>
          )}

          {/* PREFERENCES TAB (UI + Dashboard) */}
          {activeTab === 'preferences' && settings && (
            <>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>UI Preferences</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Theme</label>
                    <select value={settings.preferences?.theme || 'light'} onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System Default)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Language</label>
                    <select value={settings.preferences?.language || 'en'} onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Time Format</label>
                    <select value={settings.preferences?.time_format || '24h'} onChange={(e) => handleSettingChange('preferences', 'time_format', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                      <option value="12h">12 Hour (AM/PM)</option>
                      <option value="24h">24 Hour</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Items Per Page</label>
                    <input type="number" min="10" max="500" step="10" value={settings.preferences?.items_per_page || 50} onChange={(e) => handleSettingChange('preferences', 'items_per_page', parseInt(e.target.value))} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Dashboard Configuration</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Default View</label>
                    <select value={settings.dashboard?.default_view || 'overview'} onChange={(e) => handleSettingChange('dashboard', 'default_view', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                      <option value="overview">Overview</option>
                      <option value="logs">Logs</option>
                      <option value="alerts">Alerts</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Refresh Interval (Sec)</label>
                    <input type="number" min="5" max="300" value={settings.dashboard?.refresh_interval || 30} onChange={(e) => handleSettingChange('dashboard', 'refresh_interval', parseInt(e.target.value))} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Default Chart Type</label>
                    <select value={settings.dashboard?.chart_type || 'line'} onChange={(e) => handleSettingChange('dashboard', 'chart_type', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                      <option value="line">Line</option>
                      <option value="bar">Bar</option>
                      <option value="pie">Pie</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={settings.dashboard?.show_recent_activity || false} onChange={(e) => handleSettingChange('dashboard', 'show_recent_activity', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-color)' }}/>
                    <span style={{ fontWeight: 'bold' }}>Show Recent Activity Feed on Dashboard</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={settings.dashboard?.show_statistics || false} onChange={(e) => handleSettingChange('dashboard', 'show_statistics', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-color)' }}/>
                    <span style={{ fontWeight: 'bold' }}>Show Statistics Cards on Dashboard</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && settings && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
               <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Alert & Notification Rules</h2>
               
               <div style={{ marginBottom: '2.5rem' }}>
                 <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1.1rem', textTransform: 'uppercase' }}>Email Notifications</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                     <input type="checkbox" checked={settings.notifications?.email_notifications || false} onChange={(e) => handleSettingChange('notifications', 'email_notifications', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-color)' }}/> 
                     <strong style={{ fontSize: '1.1rem' }}>Enable Global Email Notifications</strong>
                   </label>
                   
                   <div style={{ marginLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: settings.notifications?.email_notifications ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                       <input type="checkbox" checked={settings.notifications?.critical_alerts_only || false} onChange={(e) => handleSettingChange('notifications', 'critical_alerts_only', e.target.checked)} disabled={!settings.notifications?.email_notifications} style={{ accentColor: 'var(--accent-color)' }}/> 
                       Send strictly for Critical alerts
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                       <input type="checkbox" checked={settings.notifications?.alert_notifications || false} onChange={(e) => handleSettingChange('notifications', 'alert_notifications', e.target.checked)} disabled={!settings.notifications?.email_notifications} style={{ accentColor: 'var(--accent-color)' }}/> 
                       General System Alerts
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                       <input type="checkbox" checked={settings.notifications?.ml_detection_notifications || false} onChange={(e) => handleSettingChange('notifications', 'ml_detection_notifications', e.target.checked)} disabled={!settings.notifications?.email_notifications} style={{ accentColor: 'var(--accent-color)' }}/> 
                       Machine Learning Detections
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                       <input type="checkbox" checked={settings.notifications?.suricata_notifications || false} onChange={(e) => handleSettingChange('notifications', 'suricata_notifications', e.target.checked)} disabled={!settings.notifications?.email_notifications} style={{ accentColor: 'var(--accent-color)' }}/> 
                       Suricata IDS Events
                     </label>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1.1rem', textTransform: 'uppercase' }}>Desktop & Browser</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                     <input type="checkbox" checked={settings.notifications?.notification_desktop || false} onChange={(e) => handleSettingChange('notifications', 'notification_desktop', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-color)' }}/> 
                     <span style={{ fontWeight: 'bold' }}>Enable visual desktop alerts</span>
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                     <input type="checkbox" checked={settings.notifications?.notification_sound || false} onChange={(e) => handleSettingChange('notifications', 'notification_sound', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-color)' }}/> 
                     <span style={{ fontWeight: 'bold' }}>Play audio chime for critical events</span>
                   </label>
                 </div>
               </div>
            </div>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'activity log' && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Account Activity History</h2>
              
              {activitiesLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading activity log...</div>
              ) : activities.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No recent activities found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {activities.map((activity) => (
                    <div key={activity.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ textTransform: 'capitalize', display: 'block', marginBottom: '0.4rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {activity.activity_type.replace(/_/g, ' ')}
                        </strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', minWidth: '120px' }}>IP: {activity.ip_address || 'Unknown'}</span>
                          <span>Browser: {activity.user_agent ? activity.user_agent.split(' ')[0] : 'Unknown'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--accent-color)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SYSTEM ADMIN TAB (Redirects to Manage Analysts visual style) */}
          {activeTab === 'system admin' && profile.role === 'admin' && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Manage Analysts & Users</h2>
                <button onClick={() => navigate('/admin/users')} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Advanced Management →
                </button>
              </div>
              
              {usersLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading user database...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allUsers.slice(0, 5).map(user => (
                    <div key={user.id} style={{ padding: '1.2rem', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', opacity: user.is_active ? 1 : 0.6 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{user.email} • Role: <span style={{ textTransform: 'capitalize' }}>{user.role}</span></div>
                        <div style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', display: 'inline-block', backgroundColor: user.is_active ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: user.is_active ? '#4CAF50' : '#F44336', border: `1px solid ${user.is_active ? '#4CAF50' : '#F44336'}50`, fontWeight: 'bold' }}>
                          Status: {user.is_active ? 'Active' : 'Suspended'}
                        </div>
                      </div>
                      {user.id !== authService.getStoredUser()?.id && (
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          style={{ padding: '0.6rem 1.2rem', backgroundColor: user.is_active ? 'transparent' : '#4CAF50', color: user.is_active ? '#F44336' : '#fff', border: `1px solid ${user.is_active ? '#F44336' : '#4CAF50'}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {user.is_active ? 'Suspend Access' : 'Restore Access'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ===================== RIGHT COLUMN: ACCOUNT STATS ===================== */}
        <div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', position: 'sticky', top: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📊</span> Account Snapshot
            </h3>
            <div style={{ display: 'grid', gap: '1.2rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Member Since</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Profile Update</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Concurrent Sessions</span>
                <strong style={{ color: 'var(--accent-color)', fontSize: '1.2rem' }}>{sessions.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>System Role</span>
                <strong style={{ color: profile.role === 'admin' ? '#9C27B0' : 'var(--text-primary)', textTransform: 'uppercase' }}>{profile.role}</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;