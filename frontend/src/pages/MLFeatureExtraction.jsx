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
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a1a1a' }}>Feature Extraction Pipeline</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Configure and monitor the ML feature engineering process</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Configuration</button>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export Dataset</button>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '2rem', color: '#333' }}>Extraction Pipeline Status</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connecting Line */}
          <div style={{ position: 'absolute', top: '25px', left: '50px', right: '50px', height: '4px', backgroundColor: '#e0e0e0', zIndex: 0 }}></div>
          
          {[
            { label: 'Raw Input', status: 'Active', color: '#2196F3' },
            { label: 'Cleaning', status: 'Active', color: '#2196F3' },
            { label: 'Normalization', status: 'Active', color: '#2196F3' },
            { label: 'Feature Extraction', status: 'Processing', color: '#FF9800' },
            { label: 'Model Input', status: 'Waiting', color: '#9E9E9E' }
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, backgroundColor: '#fff', padding: '0 10px' }}>
              <div style={{ 
                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: step.color, color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '4px solid #fff'
              }}>
                {i + 1}
              </div>
              <div style={{ fontWeight: '600', color: '#333' }}>{step.label}</div>
              <div style={{ fontSize: '0.8rem', color: step.color }}>{step.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Feature Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Active Features ({features.filter(f => f.status).length})</h3>
            <button style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#2196F3', border: '1px solid #2196F3', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}>
              Auto-Select Features
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', color: '#666', fontSize: '0.85rem', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.5rem' }}>FEATURE NAME</th>
                <th style={{ padding: '1rem' }}>DATA TYPE</th>
                <th style={{ padding: '1rem' }}>IMPORTANCE</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: '500' }}>{feature.name}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{feature.type}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, width: '60px', height: '6px', backgroundColor: '#eee', borderRadius: '3px' }}>
                        <div style={{ width: `${feature.weight * 100}%`, height: '100%', backgroundColor: feature.weight > 0.8 ? '#2e7d32' : '#ff9800', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>{feature.weight}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: feature.status ? '#e8f5e9' : '#f5f5f5',
                      color: feature.status ? '#2e7d32' : '#999'
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
                      style={{ background: 'none', border: 'none', color: feature.status ? '#d32f2f' : '#2196F3', cursor: 'pointer', fontWeight: '500' }}
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
          
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Extraction Time</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>12.4ms</div>
                <div style={{ fontSize: '0.8rem', color: '#2e7d32' }}>per flow</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Features</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>78</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>available</div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#333' }}>
                View Performance Report
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
             <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Test Extraction</h3>
             <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Run feature extraction on a sample flow to verify logic.</p>
             <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
               Run Test
             </button>
          </div>

        </div>

      </div>
    </div>
  )
}

export default MLFeatureExtraction