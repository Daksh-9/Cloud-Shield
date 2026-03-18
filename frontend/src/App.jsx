import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Logs from './pages/Logs'
import LiveTraffic from './pages/LiveTraffic'
import AlertManagement from './pages/Alerts'
import AlertConfig from './pages/AlertConfig'
import EventTimeline from './pages/EventTimeline'
import MLDetection from './pages/MLDetection'
import MLDataInput from './pages/MLDataInput'
import MLFeatureExtraction from './pages/MLFeatureExtraction'
import UserProfile from './pages/UserProfile'
import Notifications from './pages/Notifications'
import ManageAnalysts from './pages/ManageAnalysts'

// --- SURICATA PAGES ---
import SuricataRules from './pages/SuricataRules'
import SuricataUpload from './pages/SuricataUpload'
import SuricataLogs from './pages/SuricataLogs'

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
        
        {/* Suricata Routes */}
        <Route path="/suricata" element={<Navigate to="/suricata/rules" replace />} />
        <Route path="/suricata/rules" element={<SuricataRules />} />
        <Route path="/suricata/upload" element={<SuricataUpload />} />
        <Route path="/suricata/logs" element={<SuricataLogs />} />
        
        {/* System & Admin Routes */}
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin/users" element={<ManageAnalysts />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App