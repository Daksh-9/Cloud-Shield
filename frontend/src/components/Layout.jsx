import { Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from '../services/auth'
import Sidebar from './SideBar' 
import TopBar from './TopBar'

function Layout() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // --- UI State ---
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage for saved preference
    return localStorage.getItem('theme') === 'dark'
  })

  // --- Toggle Handlers ---
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)
  
  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)
      if (authenticated) {
        setUser(authService.getStoredUser())
      } else {
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
    // The outer div applies the 'dark-mode' class if active
    <div className={isDarkMode ? 'dark-mode' : ''} style={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)' 
    }}>
      <Sidebar 
        user={user} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen} // Pass open state to Sidebar
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar 
          user={user} 
          onToggleSidebar={toggleSidebar} 
          onToggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
        />
        
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '2rem', 
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          transition: 'background-color 0.3s'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout