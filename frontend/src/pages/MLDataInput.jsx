import { useState, useRef } from 'react'

function MLDataInput() {
  const [inputMethod, setInputMethod] = useState('pcap')
  const [isCapturing, setIsCapturing] = useState(false)
  const [files, setFiles] = useState([
    { name: 'attack_sample.pcap', size: '45.2 MB', packets: '234K', flows: '12.4K', status: 'processed' }
  ])
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Mock file drop handler
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, { 
        name: droppedFiles[0].name, 
        size: `${(droppedFiles[0].size / 1024 / 1024).toFixed(2)} MB`,
        packets: 'Pending...', 
        flows: 'Pending...', 
        status: 'pending' 
      }])
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#1a1a1a' }}>Data Input for ML Analysis</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#666' }}>Select data source for threat detection analysis</p>
      </div>

      {/* Input Method Selector */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#333' }}>Input Method:</h3>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { id: 'live', label: 'Live Stream' },
            { id: 'pcap', label: 'PCAP Upload' },
            { id: 'flow', label: 'Flow Data' }
          ].map((method) => (
            <label key={method.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: inputMethod === method.id ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                name="inputMethod" 
                checked={inputMethod === method.id} 
                onChange={() => setInputMethod(method.id)}
                style={{ marginRight: '0.5rem', accentColor: '#2196F3' }}
              />
              {method.label}
            </label>
          ))}
        </div>
      </div>

      {/* Live Stream Panel */}
      {inputMethod === 'live' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1.5rem', borderLeft: '4px solid #2196F3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
             <div>
               <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Live Network Capture</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isCapturing ? '#d32f2f' : '#ccc', boxShadow: isCapturing ? '0 0 8px #d32f2f' : 'none' }}></span>
                 <span style={{ color: '#666' }}>Status: <strong>{isCapturing ? 'Capturing' : 'Idle'}</strong></span>
               </div>
             </div>
             <select style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
               <option>All Interfaces</option>
               <option>eth0</option>
               <option>wlan0</option>
             </select>
          </div>

          {isCapturing && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Rate: <strong>5.2K flows/s</strong></span>
                <span>Captured: <strong>1.2M flows</strong></span>
              </div>
              <div style={{ height: '24px', backgroundColor: '#e3f2fd', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', 
                  backgroundSize: '1rem 1rem',
                  backgroundColor: '#2196F3',
                  animation: 'progress-bar-stripes 1s linear infinite'
                }}></div>
                <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Processing...
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsCapturing(!isCapturing)}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: isCapturing ? '#d32f2f' : '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {isCapturing ? '■ Stop Capture' : '▶ Start Capture'}
            </button>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
              ⏸ Pause
            </button>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: '#2196F3', border: '1px solid #2196F3', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
              ↓ Export Data
            </button>
          </div>
        </div>
      )}

      {/* PCAP Upload Panel */}
      {inputMethod === 'pcap' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1.5rem', borderLeft: '4px solid #FF9800' }}>
          
          {/* Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed #ddd', 
              borderRadius: '8px', 
              padding: '3rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              backgroundColor: '#fafafa',
              marginBottom: '2rem',
              transition: 'border-color 0.2s'
            }}
          >
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pcap,.pcapng,.cap" />
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Drag & Drop PCAP files here</h3>
            <p style={{ margin: 0, color: '#999' }}>or click to browse</p>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#ccc' }}>Supported: .pcap, .pcapng, .cap (Max: 500 MB)</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Uploaded Files:</h4>
              <div style={{ border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                {files.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                    <div style={{ fontSize: '1.5rem', marginRight: '1rem' }}>📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{file.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {file.size} • {file.packets} packets • {file.flows} flows
                      </div>
                    </div>
                    {file.status === 'processed' ? (
                       <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓ Processed</span>
                    ) : (
                       <span style={{ color: '#ff9800', fontWeight: 'bold' }}>⌛ Pending</span>
                    )}
                    <button style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Process PCAP</button>
            <button onClick={() => setFiles([])} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', cursor: 'pointer' }}>Clear All</button>
          </div>
        </div>
      )}

      {/* Flow Data Panel */}
      {inputMethod === 'flow' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1.5rem', borderLeft: '4px solid #9C27B0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Flow Format</label>
            <select style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}>
              <option>NetFlow v9</option>
              <option>IPFIX</option>
              <option>sFlow</option>
              <option>CSV Export</option>
            </select>
          </div>
          <button style={{ width: '100%', padding: '2rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#fafafa', cursor: 'pointer', color: '#666' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
            Upload flow export file (.csv, .json)
          </button>
        </div>
      )}

      {/* Processing Options */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Processing Options</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" defaultChecked /> Extract features automatically
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" defaultChecked /> Run ML detection
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" defaultChecked /> Generate alerts
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" /> Store in database (Long-term)
          </label>
        </div>
        
        <button style={{ width: '100%', padding: '1rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
          Start Analysis
        </button>
      </div>

    </div>
  )
}

// --- CRITICAL: Ensure this export line is present! ---
export default MLDataInput