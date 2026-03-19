import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notifications';
import useSocket from '../hooks/useSocket'; // <-- IMPORTED THE SOCKET HOOK

function TopBar({ user, onToggleSidebar, onToggleTheme, isDarkMode }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null); // <-- STATE FOR POPUP NOTIFICATIONS

  // Poll for historical unread notifications on load
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch notification count", error);
      }
    };

    fetchCount(); // Initial fetch
    const interval = setInterval(fetchCount, 30000); // Poll

    return () => clearInterval(interval);
  }, []);

  // --- NEW: LISTEN TO LIVE WEBSOCKET ALERTS ---
  useSocket((event) => {
    if (event?.type === 'LOG_UPDATE' && event?.payload?.event_type === 'alert') {
      // 1. Instantly increment the bell icon count
      setUnreadCount(prev => prev + 1);

      // 2. Trigger the Toast Popup
      const alertData = event.payload.alert;
      setLatestAlert({
        title: "Security Alert Detected!",
        signature: alertData?.signature || "Unknown Threat",
        severity: alertData?.severity || 1,
        ip: event.payload.src_ip
      });

      // 3. Hide the popup after 5 seconds
      setTimeout(() => {
        setLatestAlert(null);
      }, 5000);
    }
  });

  return (
    <div style={{
      height: '64px',
      backgroundColor: 'var(--bg-secondary)', 
      borderBottom: '1px solid var(--border-color)', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      color: 'var(--text-primary)',
      transition: 'background-color 0.3s',
      position: 'relative' // Ensure relative positioning for child popups
    }}>
      {/* Left Section: Sidebar Toggle & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={onToggleSidebar}
          style={{ 
            border: 'none', 
            background: 'none', 
            fontSize: '1.5rem', 
            cursor: 'pointer',
            color: 'var(--text-primary)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          title="Toggle Sidebar"
        >
          ≡
        </button>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Cloud Shield</span>
      </div>

      {/* Middle Section: System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <span style={{ color: '#2ecc71' }}>●</span>
        <span style={{ display: 'none', '@media (min-width: 768px)': { display: 'inline' } }}>OPERATIONAL</span>
        <span style={{ margin: '0 0.5rem' }}>|</span>
        <span style={{ color: '#2ecc71' }}>HTTPS ✓</span>
      </div>

      {/* Right Section: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '50%',
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
            transition: 'background-color 0.3s'
          }}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Notification Icon */}
        <div 
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setUnreadCount(0); // Clear on click
            navigate('/notifications');
          }}
          title="View Notifications"
        >
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          {unreadCount > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '-5px', 
              right: '-5px', 
              backgroundColor: '#e74c3c', 
              color: 'white', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              padding: '1px 5px', 
              borderRadius: '10px',
              border: '2px solid var(--bg-secondary)' 
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* Profile Avatar (Combined Hub) */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
          title="User Profile & Settings"
        >
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: isDarkMode ? '#333' : '#eee', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid var(--border-color)'
          }}>
            👤
          </div>
        </div>
      </div>

      {/* --- NEW: INSTANT TOAST NOTIFICATION UI --- */}
      {latestAlert && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: latestAlert.severity >= 2 ? '#ef4444' : '#f59e0b',
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          minWidth: '300px',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🚨</span>
            <strong style={{ fontSize: '1.1rem' }}>{latestAlert.title}</strong>
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.95, lineHeight: '1.4' }}>
            <p style={{ margin: '0 0 4px 0' }}><strong>Signature:</strong> {latestAlert.signature}</p>
            <p style={{ margin: '0' }}><strong>Source IP:</strong> {latestAlert.ip}</p>
          </div>
        </div>
      )}

    </div>
  );
}

export default TopBar;