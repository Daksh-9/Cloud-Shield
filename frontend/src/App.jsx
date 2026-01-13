import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Logs from './pages/Logs'
import Suricata from './pages/Suricata'
import MLDetection from './pages/MLDetection'
import LiveTraffic from './pages/LiveTraffic'
import AlertManagement from './pages/AlertManagement'
import AlertConfig from './pages/AlertConfig'
import EventTimeline from './pages/EventTimeline'

// --- NEW IMPORTS ---
import MLDataInput from './pages/MLDataInput'
import MLFeatureExtraction from './pages/MLFeatureExtraction'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Dashboard Routes */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitoring" element={<LiveTraffic />} />
        <Route path="/logs" element={<Logs />} />
        
        {/* Alert Routes */}
        <Route path="/alerts" element={<AlertManagement />} />
        <Route path="/alerts/config" element={<AlertConfig />} />
        <Route path="/events" element={<EventTimeline />} />
        
        {/* ML Engine Routes */}
        <Route path="/ml" element={<MLDetection />} />
        <Route path="/ml/input" element={<MLDataInput />} />
        <Route path="/ml/features" element={<MLFeatureExtraction />} />
        
        <Route path="/suricata" element={<Suricata />} />
        <Route path="/settings" element={<Dashboard />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App