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
  
  // Dummy history data to initialize the graph
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

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token && isRecording) {
      const ws = monitoringService.createWebSocketConnection(
        token,
        (message) => {
          // Update state based on real backend messages here
          if (message.type === 'metrics') {
            // Example of how you would merge real data:
            // setMetrics(prev => ({ ...prev, ...message.data.metrics }))
          }
        },
        (error) => console.error('WS Error:', error)
      )
      wsRef.current = ws
    }

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [isRecording])

  return (
    <div style={{ padding: '1rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a' }}>Live Traffic Monitoring</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Real-time network traffic analysis and flow detection</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', color: isRecording ? '#d32f2f' : '#666', fontWeight: 'bold' }}>
            <span style={{ 
              width: '10px', height: '10px', backgroundColor: isRecording ? '#d32f2f' : '#ccc', 
              borderRadius: '50%', display: 'inline-block', marginRight: '8px',
              boxShadow: isRecording ? '0 0 8px #d32f2f' : 'none',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none'
            }}></span>
            {isRecording ? 'Recording' : 'Paused'}
          </span>
          <button onClick={() => setIsRecording(!isRecording)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ddd', background: '#fff', borderRadius: '4px' }}>
            {isRecording ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Packets/s', value: metrics.packets_sec.toLocaleString(), sub: '▲ +12%', color: '#2196F3' },
          { label: 'Flows/s', value: metrics.flows_sec.toLocaleString(), sub: '▼ -3%', color: '#FF9800' },
          { label: 'Bandwidth', value: `${metrics.bandwidth_gbps} Gb/s`, sub: '▲ +8%', color: '#00C853' },
          { label: 'Alerts', value: metrics.alerts_count, sub: '▲ +4', color: '#F44336' }
        ].map((item, i) => (
          <div key={i} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: `4px solid ${item.color}` }}>
            <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{item.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1a1a1a' }}>{item.value}</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: item.sub.includes('▲') ? '#00C853' : '#d32f2f' }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Traffic Graph */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>Traffic Volume (Last 10 min)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={trafficHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="time" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}K`} />
                <Tooltip 
                  contentStyle={{ border: 'none', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2196F3" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6 }} 
                  fill="url(#colorValue)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Source IPs */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>Top Source IPs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topIps.map((ip, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem', position: 'relative', zIndex: 2 }}>
                  <span style={{ fontWeight: '500' }}>{ip.ip}</span>
                  <span style={{ color: '#666' }}>{ip.packets} pkts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem', position: 'relative', zIndex: 2 }}>
                  <span>{ip.protocol}</span>
                  <span>{ip.bytes}</span>
                </div>
                {/* Progress Bar Background */}
                <div style={{ 
                  height: '4px', 
                  width: '100%', 
                  backgroundColor: '#eee', 
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Protocol Distribution */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>Protocol Distribution</h3>
          {protocols.map((p, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '500' }}>{p.name}</span>
                <span>{p.value}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${p.value}%`, height: '100%', backgroundColor: p.color }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Geographic Map Placeholder */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>Geographic Source Map</h3>
          <div style={{ 
            height: '200px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1976D2',
            border: '2px dashed #90CAF9'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🌍</span>
              [Interactive World Map Placeholder]
            </div>
          </div>
        </div>

      </div>
      
      {/* Controls Footer */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
         <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export Data</button>
         <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Configure Thresholds</button>
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