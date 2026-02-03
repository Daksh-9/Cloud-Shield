import React from 'react';

const Notifications = () => {
  const notifications = [
    { id: 1, type: 'critical', title: 'Suricata Alert: SQL Injection', time: '10 mins ago', read: false },
    { id: 2, type: 'warning', title: 'High CPU Usage on Server A', time: '1 hour ago', read: false },
    { id: 3, type: 'info', title: 'Daily Backup Completed', time: '5 hours ago', read: true },
    { id: 4, type: 'info', title: 'New Rule Added: ICMP Block', time: '1 day ago', read: true },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Notifications</h1>
        <button style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' }}>Mark all as read</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.map(notif => (
          <div key={notif.id} style={{
            padding: '1rem',
            backgroundColor: notif.read ? '#f9f9f9' : '#fff',
            borderLeft: `5px solid ${notif.type === 'critical' ? '#e74c3c' : notif.type === 'warning' ? '#f39c12' : '#3498db'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>{notif.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{notif.time}</div>
            </div>
            {!notif.read && <div style={{ width: '10px', height: '10px', backgroundColor: '#e74c3c', borderRadius: '50%' }}></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;