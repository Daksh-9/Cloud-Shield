import React, { useState } from 'react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>Settings</h1>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['General', 'Security', 'Notifications', 'API', 'System'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab.toLowerCase() ? '#333' : '#eee',
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

      {/* General Settings Panel */}
      {activeTab === 'general' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>General Settings</h2>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Organization Name</label>
              <input type="text" defaultValue="Cloud Shield Security" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Timezone</label>
                <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option>UTC</option>
                  <option>EST</option>
                  <option>PST</option>
                  <option>IST</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date Format</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label><input type="radio" name="dateFormat" /> MM/DD/YYYY</label>
                  <label><input type="radio" name="dateFormat" defaultChecked /> YYYY-MM-DD</label>
                  <label><input type="radio" name="dateFormat" /> DD/MM/YYYY</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Log Retention (Days)</label>
                  <select defaultValue="90" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="30">30</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                  </select>
               </div>
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Alert Retention (Days)</label>
                  <select defaultValue="180" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="90">90</option>
                    <option value="180">180</option>
                    <option value="365">365</option>
                  </select>
               </div>
               <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dashboard Refresh</label>
                  <select defaultValue="2" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="2">2 Seconds</option>
                    <option value="5">5 Seconds</option>
                    <option value="10">10 Seconds</option>
                  </select>
               </div>
            </div>

             <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Theme</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label><input type="radio" name="theme" defaultChecked /> Dark Mode</label>
                  <label><input type="radio" name="theme" /> Light Mode</label>
                  <label><input type="radio" name="theme" /> Auto</label>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Security Settings Panel */}
      {activeTab === 'security' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Security Configuration</h2>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Session Timeout (Minutes)</label>
              <select defaultValue="30" style={{ width: '100%', maxWidth: '200px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </select>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold' }}>Password Policy</label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label><input type="checkbox" defaultChecked disabled /> Require 8+ characters</label>
                <label><input type="checkbox" defaultChecked /> Require uppercase letters</label>
                <label><input type="checkbox" defaultChecked /> Require numbers</label>
                <label><input type="checkbox" defaultChecked /> Require special characters</label>
                <label><input type="checkbox" defaultChecked /> Expire passwords every 90 days</label>
              </div>
            </div>

            <div>
               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Two-Factor Authentication (2FA)</label>
               <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label><input type="radio" name="2fa" defaultChecked /> Required for all users</label>
                  <label><input type="radio" name="2fa" /> Optional</label>
                  <label><input type="radio" name="2fa" /> Disabled</label>
                </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>IP Whitelisting</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <input type="checkbox" id="ipWhite" defaultChecked />
                 <label htmlFor="ipWhite">Enable IP Whitelisting restrictions</label>
                 <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>Manage Whitelist</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
      </div>
    </div>
  );
};

export default Settings;