import { useState } from 'react'

function MLFeatureExtraction() {
  const [features, setFeatures] = useState([
    { id: 1, name: 'flow_duration', type: 'Float', weight: 0.85, status: true },
    { id: 2, name: 'total_fwd_packets', type: 'Integer', weight: 0.62, status: true },
    { id: 3, name: 'total_bwd_packets', type: 'Integer', weight: 0.58, status: true },
    { id: 4, name: 'flow_bytes_s', type: 'Float', weight: 0.92, status: true },
    { id: 5, name: 'flow_packets_s', type: 'Float', weight: 0.78, status: true },
    { id: 6, name: 'flow_iat_mean', type: 'Float', weight: 0.45, status: false },
    { id: 7, name: 'fwd_iat_std', type: 'Float', weight: 0.51, status: true },
  ])

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Feature Extraction Pipeline</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>Configure and monitor the ML feature engineering process</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Configuration</button>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export Dataset</button>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Extraction Pipeline Status</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connecting Line */}
          <div style={{ position: 'absolute', top: '25px', left: '50px', right: '50px', height: '4px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
          
          {[
            { label: 'Raw Input', status: 'Active', color: 'var(--accent-color)' },
            { label: 'Cleaning', status: 'Active', color: 'var(--accent-color)' },
            { label: 'Normalization', status: 'Active', color: 'var(--accent-color)' },
            { label: 'Feature Extraction', status: 'Processing', color: '#FF9800' },
            { label: 'Model Input', status: 'Waiting', color: 'var(--text-secondary)' }
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, backgroundColor: 'var(--bg-secondary)', padding: '0 10px' }}>
              <div style={{ 
                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: step.color, color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '0.5rem',
                boxShadow: 'var(--card-shadow)',
                border: '4px solid var(--bg-secondary)'
              }}>
                {i + 1}
              </div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{step.label}</div>
              <div style={{ fontSize: '0.8rem', color: step.color }}>{step.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Feature Table */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ margin: 0 }}>Active Features ({features.filter(f => f.status).length})</h3>
            <button style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}>
              Auto-Select Features
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem' }}>FEATURE NAME</th>
                <th style={{ padding: '1rem' }}>DATA TYPE</th>
                <th style={{ padding: '1rem' }}>IMPORTANCE</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: '500' }}>{feature.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{feature.type}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, width: '60px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${feature.weight * 100}%`, height: '100%', backgroundColor: feature.weight > 0.8 ? '#4CAF50' : '#FF9800', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{feature.weight}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: feature.status ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-primary)',
                      color: feature.status ? '#4CAF50' : 'var(--text-secondary)',
                      border: feature.status ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid var(--border-color)'
                    }}>
                      {feature.status ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => {
                        const newFeatures = features.map(f => f.id === feature.id ? {...f, status: !f.status} : f)
                        setFeatures(newFeatures)
                      }}
                      style={{ background: 'none', border: 'none', color: feature.status ? '#F44336' : 'var(--accent-color)', cursor: 'pointer', fontWeight: '500' }}
                    >
                      {feature.status ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extraction Time</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>12.4ms</div>
                <div style={{ fontSize: '0.8rem', color: '#4CAF50' }}>per flow</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Features</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>78</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>available</div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                View Performance Report
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
             <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Test Extraction</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Run feature extraction on a sample flow to verify logic.</p>
             <button style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
               Run Test
             </button>
          </div>

        </div>

      </div>
    </div>
  )
}

export default MLFeatureExtraction