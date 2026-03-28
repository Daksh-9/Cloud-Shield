import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { mlService } from '../services/ml'
import { authService } from '../services/auth'

function MLDetection() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inference')
  const [detections, setDetections] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [expandedDetectionId, setExpandedDetectionId] = useState(null)

  // Continuous Engine State
  const [isEngineRunning, setIsEngineRunning] = useState(false)
  const engineIntervalRef = useRef(null)
  const scanCounterRef = useRef(0)

  const [inferenceData, setInferenceData] = useState({
    data: JSON.stringify({
      "PC1": 0.5, "PC2": -1.2, "PC3": 0.1, "PC4": 3.4, "PC5": -0.8,
      "PC6": 0.2, "PC7": -0.5, "PC8": 1.1, "PC9": -0.3, "PC10": 0.9,
      "PC11": -0.1, "PC12": 0.4, "PC13": -0.7, "PC14": 1.5, "PC15": -0.2,
      "PC16": 0.8, "PC17": -0.6, "PC18": 1.2, "PC19": -0.4, "PC20": 0.7,
      "PC21": -0.9, "PC22": 1.3, "PC23": -0.2, "PC24": 0.6, "PC25": -0.5,
      "PC26": 1.0, "PC27": -0.3, "PC28": 0.5, "PC29": -0.8, "PC30": 1.4,
      "PC31": -0.1, "PC32": 0.3, "PC33": -0.7, "PC34": 1.1, "PC35": -0.4
    }, null, 2),
    modelName: '',
    autoCreateAlert: false
  })
  
  const [inferenceResult, setInferenceResult] = useState(null)
  const dataRef = useRef(inferenceData)

  const [filters, setFilters] = useState({
    detection_type: '',
    model_name: '',
    min_confidence: ''
  })

  // Keep ref in sync
  useEffect(() => {
    dataRef.current = inferenceData
  }, [inferenceData])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }
    loadDetections()
    loadModels()

    return () => {
      if (engineIntervalRef.current) clearInterval(engineIntervalRef.current)
    }
  }, [navigate])

  const loadDetections = async () => {
    try {
      const data = await mlService.getDetections({ limit: 100, ...filters })
      setDetections(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadModels = async () => {
    try {
      const data = await mlService.listModels()
      setModels(data.models || [])
      if (data.default_model && !inferenceData.modelName) {
        setInferenceData(prev => ({ ...prev, modelName: data.default_model }))
      }
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }

  // Helper to generate dynamic PCA data so the graph moves!
  const generateLivePayload = (isThreat) => {
    const newData = {};
    for (let i = 1; i <= 35; i++) {
      if (isThreat) {
        // High PCA variance indicative of DDoS
        newData[`PC${i}`] = parseFloat((Math.random() * 4.0 + 2.0).toFixed(3));
      } else {
        // Low PCA variance indicative of normal traffic
        newData[`PC${i}`] = parseFloat((Math.random() * 2.0 - 1.0).toFixed(3));
      }
    }
    return JSON.stringify(newData, null, 2);
  }

  const executeInference = async (overrideData = null, overrideAlert = null) => {
    setLoading(true)
    try {
      let payloadToParse = overrideData || dataRef.current.data;
      let shouldAlert = overrideAlert !== null ? overrideAlert : dataRef.current.autoCreateAlert;

      let parsedData;
      try {
        parsedData = JSON.parse(payloadToParse)
      } catch (e) {
        throw new Error('Invalid JSON format. Please correct the payload.')
      }

      const result = await mlService.runInference(parsedData, {
        modelName: dataRef.current.modelName || undefined,
        autoCreateAlert: shouldAlert
      })

      setInferenceResult(result)
      loadDetections() // Refresh graph data
      
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to run inference.')
      console.error(err)
      if (engineIntervalRef.current) stopEngine()
    } finally {
      setLoading(false)
    }
  }

  const startEngine = () => {
    setError('')
    setSuccess('ML Engine Started. Injecting live data stream...')
    setIsEngineRunning(true)
    scanCounterRef.current = 0;
    
    // Initial fire
    executeInference()
    
    // Loop every 3 seconds
    engineIntervalRef.current = setInterval(() => {
      scanCounterRef.current += 1;
      
      // Inject a DDoS Threat every 4th scan deterministically
      const isThreat = scanCounterRef.current % 4 === 0;
      const livePayload = generateLivePayload(isThreat);
      
      // Update the UI so the user sees the data changing in the text box
      setInferenceData(prev => {
        const updated = { ...prev, data: livePayload, autoCreateAlert: isThreat };
        dataRef.current = updated; // Force sync ref immediately for this cycle
        return updated;
      });

      // Pass the generated data directly to guarantee synchronization
      executeInference(livePayload, isThreat);
    }, 3000)
  }

  const stopEngine = () => {
    if (engineIntervalRef.current) {
      clearInterval(engineIntervalRef.current)
      engineIntervalRef.current = null
    }
    setIsEngineRunning(false)
    setSuccess('ML Engine Stopped.')
  }

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })
  const applyFilters = (e) => { e.preventDefault(); loadDetections() }
  const clearFilters = () => { setFilters({ detection_type: '', model_name: '', min_confidence: '' }); setTimeout(loadDetections, 50) }
  const toggleRow = (id) => setExpandedDetectionId(expandedDetectionId === id ? null : id);

  const getIndicatorColor = (confidence, detectionType) => {
    if (detectionType && detectionType.toLowerCase() === 'benign') return '#4CAF50' 
    if (confidence >= 0.8) return '#F44336' 
    if (confidence >= 0.6) return '#FF9800' 
    return '#4CAF50' 
  }

  const getStatusIcon = (detectionType) => {
    if (detectionType && detectionType.toLowerCase() === 'benign') return '✅'
    if (detectionType && detectionType.toLowerCase() === 'unknown') return '❓'
    return '⚠️' 
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const safeDateString = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`
    return new Date(safeDateString).toLocaleString()
  }

  // Analytics Data Preparation
  const totalDetections = detections.length;
  const benignCount = detections.filter(d => d.detection_type?.toLowerCase() === 'benign').length;
  const threatCount = detections.filter(d => ['anomaly', 'intrusion', 'malware'].includes(d.detection_type?.toLowerCase())).length;
  const unknownCount = totalDetections - benignCount - threatCount;

  const benignPercent = totalDetections ? (benignCount / totalDetections) * 100 : 0;
  const threatPercent = totalDetections ? (threatCount / totalDetections) * 100 : 0;
  const unknownPercent = totalDetections ? (unknownCount / totalDetections) * 100 : 0;

  const pieData = [
    { name: 'Benign', value: benignCount, color: '#4CAF50' },
    { name: 'Threats', value: threatCount, color: '#F44336' },
    { name: 'Unknown', value: unknownCount, color: '#9E9E9E' }
  ].filter(d => d.value > 0);

  // Prepare line chart data
  const lineChartData = [...detections].slice(0, 20).reverse().map(d => {
    const safeDateString = d.created_at.endsWith('Z') || d.created_at.includes('+') ? d.created_at : `${d.created_at}Z`
    return {
      time: new Date(safeDateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      confidence: parseFloat((d.confidence * 100).toFixed(1)),
      type: d.detection_type
    }
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          <p style={{ margin: '0 0 5px 0', color: getIndicatorColor(data.confidence / 100, data.type) }}>
            Confidence: {data.confidence}%
          </p>
          <p style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.8rem' }}>Type: {data.type}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ color: 'var(--text-primary)', maxWidth: '1600px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>ML Detection Engine</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('inference')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: activeTab === 'inference' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'inference' ? '#fff' : 'var(--text-secondary)', border: 'none', borderBottom: activeTab === 'inference' ? '2px solid var(--accent-color)' : 'none', cursor: 'pointer', fontSize: '1rem', marginBottom: '-2px', transition: 'all 0.2s' }}
        >
          Engine Controls
        </button>
        <button
          onClick={() => setActiveTab('detections')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: activeTab === 'detections' ? 'var(--accent-color)' : 'transparent', color: activeTab === 'detections' ? '#fff' : 'var(--text-secondary)', border: 'none', borderBottom: activeTab === 'detections' ? '2px solid var(--accent-color)' : 'none', cursor: 'pointer', fontSize: '1rem', marginBottom: '-2px', transition: 'all 0.2s' }}
        >
          Detection History
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '4px', border: '1px solid #F44336' }}>
          {error}
        </div>
      )}
      
      {success && !isEngineRunning && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '4px', border: '1px solid #4CAF50' }}>
          {success}
        </div>
      )}

      {/* --- INFERENCE TAB --- */}
      {activeTab === 'inference' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* TOP ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Input Panel */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Input Configuration (Live Feed)</h2>
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Payload Data (JSON)</label>
                  <textarea
                    value={inferenceData.data}
                    onChange={(e) => setInferenceData({ ...inferenceData, data: e.target.value })}
                    disabled={isEngineRunning}
                    required
                    rows={15}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem', backgroundColor: 'var(--bg-primary)', color: isEngineRunning ? '#4CAF50' : 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Model Selection</label>
                  <select
                    value={inferenceData.modelName}
                    onChange={(e) => setInferenceData({ ...inferenceData, modelName: e.target.value })}
                    disabled={isEngineRunning}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
                  >
                    <option value="">Use Default Model</option>
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isEngineRunning ? 'not-allowed' : 'pointer', opacity: isEngineRunning ? 0.5 : 1 }}>
                    <input
                      type="checkbox"
                      checked={inferenceData.autoCreateAlert}
                      onChange={(e) => setInferenceData({ ...inferenceData, autoCreateAlert: e.target.checked })}
                      disabled={isEngineRunning}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '0.95rem' }}>Auto-create security alert on threat detection</span>
                  </label>
                </div>

                {/* Start / Stop Controls */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={startEngine}
                    disabled={isEngineRunning}
                    style={{ flex: 1, padding: '0.85rem', backgroundColor: isEngineRunning ? 'var(--bg-primary)' : '#4CAF50', color: isEngineRunning ? 'var(--text-secondary)' : '#fff', border: isEngineRunning ? '1px solid var(--border-color)' : 'none', borderRadius: '6px', cursor: isEngineRunning ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    ▶ Start ML Engine
                  </button>

                  <button
                    type="button"
                    onClick={stopEngine}
                    disabled={!isEngineRunning}
                    style={{ flex: 1, padding: '0.85rem', backgroundColor: !isEngineRunning ? 'var(--bg-primary)' : '#F44336', color: !isEngineRunning ? 'var(--text-secondary)' : '#fff', border: !isEngineRunning ? '1px solid var(--border-color)' : 'none', borderRadius: '6px', cursor: !isEngineRunning ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    ⏹ Stop Engine
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Result Panel */}
            <div>
              {inferenceResult ? (
                <div style={{ padding: '2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', borderTop: `6px solid ${getIndicatorColor(inferenceResult.confidence, inferenceResult.detection_type)}`, height: '100%', animation: 'fadeIn 0.5s ease-in-out' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '2.5rem' }}>{getStatusIcon(inferenceResult.detection_type)}</span>
                      <div>
                          <h2 style={{ margin: 0, fontSize: '1.8rem', color: getIndicatorColor(inferenceResult.confidence, inferenceResult.detection_type) }}>
                          {inferenceResult.prediction}
                          </h2>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Detection Type: {inferenceResult.detection_type}
                          </span>
                      </div>
                      </div>

                      {isEngineRunning && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', borderRadius: '12px', border: '1px solid #F44336', fontSize: '0.85rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
                              <div style={{ width: '8px', height: '8px', backgroundColor: '#F44336', borderRadius: '50%' }} />
                              SCANNING
                          </div>
                      )}
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Model Confidence</strong>
                      <strong>{(inferenceResult.confidence * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ height: '100%', width: `${inferenceResult.confidence * 100}%`, backgroundColor: getIndicatorColor(inferenceResult.confidence, inferenceResult.detection_type), transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Executing Model</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{inferenceResult.model_name}</div>
                    </div>

                    {inferenceResult.alert_id && (
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '6px', border: '1px solid #FF9800', color: '#FF9800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔔</span><strong>Alert Generated:</strong> {inferenceResult.alert_id}
                      </div>
                    )}

                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '0.5rem 0', color: 'var(--accent-color)' }}>View Extracted Feature Vector</summary>
                      <pre style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {JSON.stringify(inferenceResult.features, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '2rem' }}>
                    <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>⚙️</span>
                    <p>Awaiting engine start...</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ROW: Live Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            
            {/* Line Chart */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 📈 Live Confidence Stream
              </h2>
              {lineChartData.length > 0 ? (
                <div style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                      <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line type="stepAfter" dataKey="confidence" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Not enough data to graph
                </div>
              )}
            </div>

            {/* Donut Chart */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>
                 Traffic Distribution
              </h2>
              {pieData.length > 0 ? (
                <div style={{ height: 250, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    {pieData.map(entry => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No traffic analyzed yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- DETECTIONS TAB --- */}
      {activeTab === 'detections' && (
        <div>
          {/* Traffic Summary Bar */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Traffic Classification Overview</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Total Scans: {totalDetections}</span>
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ Benign ({benignPercent.toFixed(1)}%)</span>
              <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>❓ Unknown ({unknownPercent.toFixed(1)}%)</span>
              <span style={{ color: '#F44336', fontWeight: 'bold' }}>⚠️ Suspicious ({threatPercent.toFixed(1)}%)</span>
            </div>

            {totalDetections > 0 ? (
              <div style={{ display: 'flex', width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                {benignPercent > 0 && <div style={{ width: `${benignPercent}%`, backgroundColor: '#4CAF50', transition: 'width 0.5s ease-in-out' }} title={`Benign: ${benignCount}`} />}
                {unknownPercent > 0 && <div style={{ width: `${unknownPercent}%`, backgroundColor: '#9E9E9E', transition: 'width 0.5s ease-in-out' }} title={`Unknown: ${unknownCount}`} />}
                {threatPercent > 0 && <div style={{ width: `${threatPercent}%`, backgroundColor: '#F44336', transition: 'width 0.5s ease-in-out' }} title={`Threats: ${threatCount}`} />}
              </div>
            ) : (
              <div style={{ width: '100%', height: '24px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                No classification data available
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <form onSubmit={applyFilters} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', border: '1px solid var(--border-color)' }}>
            
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Detection Type</label>
              <select name="detection_type" value={filters.detection_type} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="">All Types</option>
                <option value="benign">Benign</option>
                <option value="anomaly">Anomaly</option>
                <option value="intrusion">Intrusion</option>
                <option value="malware">Malware</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Model Name</label>
              <input type="text" name="model_name" value={filters.model_name} onChange={handleFilterChange} placeholder="e.g., traffic_classifier" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Min Confidence</label>
              <input type="number" name="min_confidence" value={filters.min_confidence} onChange={handleFilterChange} min="0" max="1" step="0.1" placeholder="0.0 - 1.0" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply Filters</button>
              <button type="button" onClick={clearFilters} style={{ padding: '0.6rem 1rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            </div>
          </form>

          {/* Detections Table */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            
            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>
                Detection History List
              </strong>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '180px' }}>Timestamp</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)' }}>Prediction Output</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '150px' }}>Detection Type</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '150px' }}>Model</th>
                    <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', width: '120px' }}>Confidence</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && detections.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</td></tr>
                  ) : detections.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No detections found.</td></tr>
                  ) : (
                    detections.map((detection, idx) => {
                      const isExpanded = expandedDetectionId === detection.id;
                      const indColor = getIndicatorColor(detection.confidence, detection.detection_type);
                      
                      return (
                        <React.Fragment key={detection.id || idx}>
                          <tr onClick={() => toggleRow(detection.id)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(33, 150, 243, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)'), transition: 'background-color 0.2s', borderLeft: `4px solid ${indColor}` }}>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(detection.created_at)}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                              {getStatusIcon(detection.detection_type)} {detection.prediction}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: indColor, backgroundColor: `${indColor}15`, border: `1px solid ${indColor}50`, textTransform: 'uppercase' }}>
                                {detection.detection_type}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{detection.model_name}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ padding: '4px 8px', backgroundColor: `${indColor}20`, color: indColor, border: `1px solid ${indColor}`, borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                {(detection.confidence * 100).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                              <td colSpan="5" style={{ padding: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                                   <div>
                                      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Feature Extraction Payload</h3>
                                      <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', overflowX: 'auto', fontSize: '0.85rem' }}>
                                        <div style={{ marginBottom: '0.5rem', color: '#569cd6', fontWeight: 'bold' }}>// Data parsed by model</div>
                                        <pre style={{ margin: 0 }}>{JSON.stringify(detection.features, null, 2)}</pre>
                                      </div>
                                   </div>
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                          <strong style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)' }}>System Context</strong>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                              <div style={{ marginBottom: '0.5rem' }}><strong>Detection ID:</strong> {detection.id}</div>
                                              {detection.related_log_id ? (
                                                <div style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                                  📄 <strong>Related Log:</strong> {detection.related_log_id}
                                                </div>
                                              ) : (
                                                <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No linked log events.</div>
                                              )}
                                              {detection.related_alert_id ? (
                                                <div style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid #FF9800', color: '#FF9800', borderRadius: '4px', cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
                                                  🚨 <strong>Generated Alert:</strong> {detection.related_alert_id}
                                                </div>
                                              ) : (
                                                <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Did not trigger an alert.</div>
                                              )}
                                          </div>
                                      </div>
                                   </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default MLDetection