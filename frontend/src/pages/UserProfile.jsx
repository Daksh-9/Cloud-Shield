import React, { useState } from 'react';

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>User Profile</h1>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['Profile', 'Security', 'Preferences', 'Activity Log'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab.toLowerCase() ? '#3498db' : '#eee',
              color: activeTab === tab.toLowerCase() ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Profile Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Profile Information Panel */}
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Profile Information</h3>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  👤
                </div>
                <button style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Change Avatar</button>
              </div>
              
              <div style={{ flex: 1 }}>
                 <div style={{ marginBottom: '0.5rem' }}><strong>Username:</strong> admin_user</div>
                 <div style={{ marginBottom: '0.5rem' }}><strong>Role:</strong> <span style={{ backgroundColor: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>SOC Administrator</span></div>
                 <div><strong>Email:</strong> admin@example.com</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Full Name</label>
                <input type="text" defaultValue="System Administrator" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Phone</label>
                <input type="text" defaultValue="+1 (555) 123-4567" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Department</label>
                <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option>Security Operations</option>
                  <option>IT Administration</option>
                  <option>Management</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
             <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Notification Preferences</h3>
             
             <div style={{ marginBottom: '1.5rem' }}>
               <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Email Notifications</strong>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" defaultChecked /> Critical alerts</label>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" defaultChecked /> High severity alerts</label>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" /> Medium severity alerts</label>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" /> Daily digest</label>
             </div>

             <div>
               <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Desktop Notifications</strong>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" defaultChecked /> Enable desktop notifications</label>
               <label style={{ display: 'block', marginBottom: '0.25rem' }}><input type="checkbox" defaultChecked /> Play sound for critical alerts</label>
             </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Update Profile</button>
          </div>

        </div>

        {/* Right Column: Account Statistics */}
        <div>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Account Statistics</h3>
            <div style={{ display: 'grid', gap: '0.8rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Member Since:</span>
                <strong>2025-06-15</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Last Login:</span>
                <strong>2026-02-03 14:23 UTC</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Total Sessions:</span>
                <strong>1,247</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Alerts Resolved:</span>
                <strong style={{ color: '#2ecc71' }}>3,456</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;