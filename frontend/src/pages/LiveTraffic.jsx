import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { monitoringService } from '../services/monitoring'

function LiveTraffic() {
  const [metrics, setMetrics] = useState({
    packets_sec: 127400,
    flows_sec: 5200,
    bandwidth_gbps: 2.3,
    alerts_count: 12
  })
  
  const [trafficHistory, setTrafficHistory] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      time: `${10 + Math.floor(i/2)}:${(i%2)*30}`.padStart(5, '0'),
      value: 100000 + Math.random() * 50000
    }))
  )

  const [topIps, setTopIps] = useState([
    { ip: '203.0.113.45', packets: '24.5K', bytes: '18.2 MB', protocol: 'TCP', percent: 75 },
    { ip: '198.51.100.23', packets: '12.1K', bytes: '9.4 MB', protocol: 'UDP', percent: 38 },
    { ip: '192.0.2.67', packets: '8.3K', bytes: '6.1 MB', protocol: 'TCP', percent: 26 },
    { ip: '203.0.113.89', packets: '4.2K', bytes: '3.8 MB', protocol: 'ICMP', percent: 13 },
  ])

  const [protocols, setProtocols] = useState([
    { name: 'TCP', value: 64, color: '#2196F3' },
    { name: 'UDP', value: 28, color: '#FF9800' },
    { name: 'ICMP', value: 5, color: '#F44336' },
    { name: 'Other', value: 3, color: '#9E9E9E' },
  ])

  const [isRecording, setIsRecording] = useState(true)
  const wsRef = useRef(null)

  // Detect dark mode for Recharts colors
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial mode
    const checkMode = () => setIsDarkMode(document.body.classList.contains('dark-mode'));
    checkMode();

    // Listen for changes (MutationObserver is best, but interval is simpler for now)
    const observer = new MutationObserver(checkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Live Traffic Monitoring</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>Real-time network traffic analysis and flow detection</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', color: isRecording ? '#d32f2f' : 'var(--text-secondary)', fontWeight: 'bold' }}>
            <span style={{ 
              width: '10px', height: '10px', backgroundColor: isRecording ? '#d32f2f' : 'var(--border-color)', 
              borderRadius: '50%', display: 'inline-block', marginRight: '8px',
              boxShadow: isRecording ? '0 0 8px #d32f2f' : 'none',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none'
            }}></span>
            {isRecording ? 'Recording' : 'Paused'}
          </span>
          <button 
            onClick={() => setIsRecording(!isRecording)} 
            style={{ 
              padding: '0.5rem 1rem', 
              cursor: 'pointer', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)',
              borderRadius: '4px' 
            }}
          >
            {isRecording ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Packets/s', value: metrics.packets_sec.toLocaleString(), sub: '▲ +12%', color: '#2196F3' },
          { label: 'Flows/s', value: metrics.flows_sec.toLocaleString(), sub: '▼ -3%', color: '#FF9800' },
          { label: 'Bandwidth', value: `${metrics.bandwidth_gbps} Gb/s`, sub: '▲ +8%', color: '#00C853' },
          { label: 'Alerts', value: metrics.alerts_count, sub: '▲ +4', color: '#F44336' }
        ].map((item, i) => (
          <div key={i} style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            boxShadow: 'var(--card-shadow)', 
            borderTop: `4px solid ${item.color}`,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{item.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.value}</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: item.sub.includes('▲') ? '#00C853' : '#d32f2f' }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Traffic Graph */}
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Traffic Volume (Last 10 min)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={trafficHistory}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={isDarkMode ? "#333" : "#eee"} // Dynamic Stroke
                />
                <XAxis 
                  dataKey="time" 
                  stroke={isDarkMode ? "#888" : "#666"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke={isDarkMode ? "#888" : "#666"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value/1000}K`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    border: 'none', 
                    borderRadius: '4px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2196F3" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Source IPs */}
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Top Source IPs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topIps.map((ip, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem', position: 'relative', zIndex: 2 }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{ip.ip}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{ip.packets} pkts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', position: 'relative', zIndex: 2 }}>
                  <span>{ip.protocol}</span>
                  <span>{ip.bytes}</span>
                </div>
                <div style={{ 
                  height: '4px', 
                  width: '100%', 
                  backgroundColor: 'var(--bg-primary)', 
                  borderRadius: '2px', 
                  overflow: 'hidden' 
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${ip.percent}%`, 
                    backgroundColor: ip.protocol === 'TCP' ? '#2196F3' : ip.protocol === 'UDP' ? '#FF9800' : '#607D8B' 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Protocol Distribution */}
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Protocol Distribution</h3>
          {protocols.map((p, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.value}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${p.value}%`, height: '100%', backgroundColor: p.color }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Geographic Map Placeholder */}
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Geographic Source Map</h3>
          <div style={{ 
            height: '200px', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent-color)',
            border: '2px dashed var(--border-color)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🌍</span>
              [Map Component]
            </div>
          </div>
        </div>

      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default LiveTraffic