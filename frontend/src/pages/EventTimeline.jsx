import React, { useState, useRef } from 'react';

function EventTimeline() {
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const timelineRef = useRef(null);

  // Event data structured based on the Alert model
  const [events] = useState([
    { 
      id: 1,
      time: '14:24:00', 
      title: 'SYN Flood Attack', 
      type: 'alert', 
      severity: 'Critical',
      source: '203.0.113.45',
      details: 'Threshold exceeded (87.3K pkts/s)',
      status: 'Resolved',
      acknowledgedBy: 'admin_user',
      resolvedBy: 'system_auto',
      metadata: { duration: '2m 34s', confidence: '98.7%' }
    },
    { 
      id: 2,
      time: '14:20:12', 
      title: 'UDP Amplification', 
      type: 'alert', 
      severity: 'High',
      source: 'Multiple (45 IPs)',
      details: 'UDP Amp rules matched',
      status: 'Acknowledged',
      acknowledgedBy: 'analyst_01',
      resolvedBy: null,
      metadata: { factor: '58x', confidence: '94.2%' }
    },
    { 
      id: 3, 
      time: '14:15:33', 
      title: 'Unusual Traffic', 
      type: 'alert', 
      severity: 'Medium',
      source: '198.51.100.23',
      details: 'ML Detection: Anomalous flow behavior',
      status: 'Open',
      acknowledgedBy: null,
      resolvedBy: null,
      metadata: { deviation: '3.2 σ', confidence: '85.0%' }
    },
    { 
      id: 4, 
      time: '14:05:00', 
      title: 'User Login', 
      type: 'user', 
      severity: 'Low',
      source: '192.168.1.5',
      details: 'User admin_user logged in',
      status: 'Completed',
      acknowledgedBy: null,
      resolvedBy: null,
      metadata: { location: 'Internal Subnet' }
    }
  ]);

  const getSeverityColor = (severity) => {
    const colors = { Critical: '#d32f2f', High: '#ed6c02', Medium: '#ef6c00', Low: '#2e7d32' };
    return colors[severity] || '#757575';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
      <h1 style={{ marginBottom: '2.5rem', textAlign: 'center' }}>Interactive Security Event Timeline</h1>

      {/* --- Event Boxes: 2-Column Grid --- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        marginBottom: '5rem'
      }}>
        {events.map((event) => {
          const isActive = hoveredEventId === event.id || selectedEventId === event.id;
          return (
            <div 
              key={event.id} 
              onMouseEnter={() => setHoveredEventId(event.id)}
              onMouseLeave={() => setHoveredEventId(null)}
              style={{ 
                position: 'relative', // Required for z-index to work
                zIndex: isActive ? 10 : 1, // Brings the active card to the absolute top
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                borderLeft: `8px solid ${getSeverityColor(event.severity)}`,
                // Enhanced shadow and scale to make it "pop out"
                boxShadow: isActive ? `0 20px 40px rgba(0,0,0,0.2)` : `0 4px 6px rgba(0,0,0,0.05)`,
                transform: isActive ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // Fades out other cards more aggressively for focus
                opacity: (hoveredEventId && !isActive) ? 0.3 : 1, 
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', borderTopRightRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: getSeverityColor(event.severity), letterSpacing: '1px' }}>
                    {event.severity.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>{event.time}</span>
                </div>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem' }}>{event.title}</h3>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.95rem', lineHeight: '1.5' }}>{event.details}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: '#555', marginBottom: '1.5rem' }}>
                  <div><strong>Source:</strong> {event.source}</div>
                  <div><strong>Status:</strong> {event.status}</div>
                  {event.acknowledgedBy && <div style={{ gridColumn: 'span 2' }}><strong>Acknowledged:</strong> {event.acknowledgedBy}</div>}
                  {event.resolvedBy && <div style={{ gridColumn: 'span 2' }}><strong>Resolved:</strong> {event.resolvedBy}</div>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(event.metadata).map(([key, val]) => (
                    <span key={key} style={{ fontSize: '0.7rem', background: '#f0f0f0', padding: '3px 8px', borderRadius: '15px', color: '#666' }}>
                      {key}: {val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Horizontal Interactive Timeline (Bottom) --- */}
      <div style={{ 
        position: 'sticky', 
        bottom: '2rem',
        background: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(10px)',
        padding: '2rem', 
        borderRadius: '20px',
        boxShadow: '0 -5px 20px rgba(0,0,0,0.05)',
        border: '1px solid #eee',
        zIndex: 20 // Ensures the timeline itself stays above the expanding cards
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          position: 'relative',
          padding: '0 40px'
        }}
        ref={timelineRef}
        >
          {/* Connector Track */}
          <div style={{ position: 'absolute', height: '4px', background: '#e0e0e0', left: '60px', right: '60px', top: '12px', zIndex: 0, borderRadius: '2px' }}></div>
          
          {events.map((event) => {
            const isHovered = hoveredEventId === event.id;
            return (
              <div 
                key={event.id}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  zIndex: 1,
                  transition: 'transform 0.2s ease'
                }}
              >
                <div style={{ 
                  width: isHovered ? '28px' : '24px', 
                  height: isHovered ? '28px' : '24px', 
                  borderRadius: '50%', 
                  backgroundColor: isHovered ? getSeverityColor(event.severity) : '#fff',
                  border: `4px solid ${getSeverityColor(event.severity)}`,
                  transition: 'all 0.3s ease',
                  boxShadow: isHovered ? `0 0 15px ${getSeverityColor(event.severity)}` : '0 2px 4px rgba(0,0,0,0.1)',
                  transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                }}></div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  marginTop: '0.75rem', 
                  fontWeight: isHovered ? 'bold' : '600',
                  color: isHovered ? '#000' : '#888',
                  transition: 'color 0.3s ease'
                }}>
                  {event.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EventTimeline;