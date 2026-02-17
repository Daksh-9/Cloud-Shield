// frontend/src/pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notifications';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (id) => {
    // Navigate to the specific alert details page
    navigate(`/alerts/${id}`);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'critical': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'medium': return '#f1c40f';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <button 
          onClick={loadNotifications}
          style={{ 
            padding: '0.5rem 1rem', 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔕</div>
          <p>No notifications found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif.id)}
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: `5px solid ${getTypeColor(notif.type)}`,
                boxShadow: 'var(--card-shadow)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {notif.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {notif.source} • {formatTime(notif.time)}
                </div>
              </div>
              {!notif.read && (
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: getTypeColor(notif.type), 
                  borderRadius: '50%',
                  boxShadow: `0 0 5px ${getTypeColor(notif.type)}`
                }}></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;