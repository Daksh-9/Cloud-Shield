import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>Cloud Shield Dashboard</h1>

      {/* System Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Sources Active', value: '19/24', status: '✓ Healthy', color: '#2ecc71' },
          { label: 'Logs/s', value: '127.4K', status: '▲ Normal', color: '#3498db' },
          { label: 'Alerts Active', value: '12', status: '🔴 High', color: '#e74c3c' },
          { label: 'Threats Detected', value: '847', status: 'Today', color: '#f39c12' }
        ].map((card, idx) => (
          <div key={idx} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>{card.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{card.value}</div>
            <div style={{ color: card.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{card.status}</div>
          </div>
        ))}
      </div>

      {/* Traffic Overview Graph Placeholder */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Traffic Overview (Last Hour)</h3>
        <div style={{ height: '250px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'flex-end', padding: '1rem', gap: '5px', borderRadius: '4px', border: '1px solid #eee' }}>
           {/* Mock Bars to simulate graph */}
           {Array.from({ length: 60 }).map((_, i) => {
             const height = Math.floor(Math.random() * 80) + 20;
             return (
               <div key={i} style={{ flex: 1, height: `${height}%`, backgroundColor: i > 50 ? '#e74c3c' : '#3498db', opacity: 0.7 }}></div>
             )
           })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
          <span>60m</span><span>45m</span><span>30m</span><span>15m</span><span>5m</span><span>now</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Active Threats */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Active Threats</h3>
            <button style={{ border: 'none', background: 'none', color: '#3498db', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'SYN Flood', ip: '203.115.x.x', metric: '87.3K pps', severity: 'critical' },
              { name: 'UDP Amp.', ip: '198.51.x.x', metric: 'Amp: 58x', severity: 'high' },
              { name: 'Anomaly', ip: '192.168.x.x', metric: 'ML: 94%', severity: 'medium' }
            ].map((threat, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: `4px solid ${threat.severity === 'critical' ? '#e74c3c' : threat.severity === 'high' ? '#f39c12' : '#f1c40f'}` }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{threat.name} <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>{threat.ip}</span></div>
                  <div style={{ fontSize: '0.8rem' }}>{threat.metric}</div>
                </div>
                <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>Action &gt;</button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Recent Alerts</h3>
             <button style={{ border: 'none', background: 'none', color: '#3498db', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {[
               { time: '14:35', type: 'SYN Flood', sev: 'Critical' },
               { time: '14:30', type: 'UDP Amp.', sev: 'High' },
               { time: '14:25', type: 'Anomaly', sev: 'Medium' }
             ].map((alert, idx) => (
               <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #eee' }}>
                 <span style={{ fontSize: '0.85rem', color: '#666', minWidth: '50px' }}>{alert.time}</span>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: 'bold' }}>{alert.type}</div>
                   <div style={{ fontSize: '0.8rem', color: alert.sev === 'Critical' ? '#e74c3c' : alert.sev === 'High' ? '#e67e22' : '#f1c40f' }}>{alert.sev}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* ML Status */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '1rem' }}>ML Detection Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ marginBottom: '0.5rem' }}>Status: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>● Active</span></div>
              <div style={{ marginBottom: '0.5rem' }}>Model: <strong>RF v2.4</strong></div>
              <div style={{ marginBottom: '0.5rem' }}>Accuracy: <strong>98.7%</strong></div>
            </div>
            <div>
              <div style={{ marginBottom: '0.5rem' }}>Analyzed: <strong>124.5K</strong></div>
              <button onClick={() => navigate('/ml')} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View Details</button>
            </div>
          </div>
        </div>

        {/* Suricata Status */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Suricata Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ marginBottom: '0.5rem' }}>Status: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>● Running</span></div>
              <div style={{ marginBottom: '0.5rem' }}>Version: <strong>8.0.3</strong></div>
              <div style={{ marginBottom: '0.5rem' }}>Rules: <strong>Active</strong></div>
            </div>
            <div>
              <div style={{ marginBottom: '0.5rem' }}>Alerts (24h): <strong>2,847</strong></div>
              <button onClick={() => navigate('/suricata/rules')} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View Details</button>
            </div>
          </div>
        </div>
      </div>

      {/* Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Top Source Countries</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[{c:'US', v:45}, {c:'CN', v:28}, {c:'RU', v:12}, {c:'BR', v:8}, {c:'Other', v:7}].map(d => (
              <div key={d.c} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '40px' }}>{d.c}</span>
                <div style={{ flex: 1, backgroundColor: '#eee', height: '10px', borderRadius: '5px' }}>
                  <div style={{ width: `${d.v}%`, backgroundColor: '#3498db', height: '100%', borderRadius: '5px' }}></div>
                </div>
                <span style={{ width: '30px', textAlign: 'right' }}>{d.v}%</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
           <h3>Protocol Distribution</h3>
           <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[{c:'TCP', v:64}, {c:'UDP', v:28}, {c:'ICMP', v:5}, {c:'Other', v:3}].map(d => (
              <div key={d.c} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '40px' }}>{d.c}</span>
                <div style={{ flex: 1, backgroundColor: '#eee', height: '10px', borderRadius: '5px' }}>
                  <div style={{ width: `${d.v}%`, backgroundColor: '#e67e22', height: '100%', borderRadius: '5px' }}></div>
                </div>
                <span style={{ width: '30px', textAlign: 'right' }}>{d.v}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;