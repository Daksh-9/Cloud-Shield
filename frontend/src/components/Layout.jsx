import { Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from '../services/auth'
// --- FIX: Capitalize the filenames to match the actual files ---
import Sidebar from './SideBar' 
import TopBar from './TopBar'

function Layout() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)
      if (authenticated) {
        setUser(authService.getStoredUser())
      } else {
        // This is what causes the "flicker" if auth fails
        navigate('/login')
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [navigate])

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/login')
  }

  if (loading) return null 

  if (!isAuthenticated) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar user={user} />
        
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: '#f5f5f5' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout