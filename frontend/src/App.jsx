import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="logs" element={<Logs />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="suricata" element={<Suricata />} />
        <Route path="ml" element={<MLDetection />} />
      </Route>
    </Routes>
  )
}

export default App

