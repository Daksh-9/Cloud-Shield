function EventTimeline() {
    const events = [
      { time: '14:24:00', title: 'System Auto-Blocked IP 203.0.113.45', type: 'system', details: 'Threshold exceeded (87.3K pkts/s)' },
      { time: '14:23:45', title: 'Critical Alert Triggered: SYN Flood', type: 'alert', details: 'Rule: SYN Flood Detect' },
      { time: '14:20:12', title: 'High Alert Triggered: UDP Amp', type: 'alert', details: 'Rule: UDP Amplification' },
      { time: '14:05:00', title: 'User admin_user logged in', type: 'user', details: 'IP: 192.168.1.5' },
      { time: '13:55:00', title: 'Rule Database Updated', type: 'system', details: 'Added 5 new signatures' },
    ]
  
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>Event Timeline</h1>
        
        <div style={{ position: 'relative', borderLeft: '2px solid #ddd', paddingLeft: '2rem' }}>
          {events.map((event, i) => (
            <div key={i} style={{ marginBottom: '2rem', position: 'relative' }}>
              {/* Timeline Dot */}
              <div style={{ 
                position: 'absolute', 
                left: '-2.6rem', 
                top: '0', 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                backgroundColor: event.type === 'alert' ? '#d32f2f' : event.type === 'system' ? '#2196F3' : '#757575',
                border: '4px solid #f5f5f5'
              }}></div>
              
              <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.85rem', color: '#999', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>{event.time}</span>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#333' }}>{event.title}</h3>
                <p style={{ margin: 0, color: '#666' }}>{event.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  export default EventTimeline