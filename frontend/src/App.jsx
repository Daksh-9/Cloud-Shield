import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Logs from './pages/Logs'
import Alerts from './pages/Alerts'
import Suricata from './pages/Suricata'
import MLDetection from './pages/MLDetection'

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
        <Route path="/logs" element={<Logs />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/suricata" element={<Suricata />} />
        <Route path="/ml" element={<MLDetection />} />
        
        {/* Placeholders for new links to avoid 404s, mapped to Dashboard for now */}
        <Route path="/monitoring" element={<Dashboard />} />
        <Route path="/settings" element={<Dashboard />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App