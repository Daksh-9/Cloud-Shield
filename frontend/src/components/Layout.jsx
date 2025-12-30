import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from '../services/auth'

function Layout() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)
      if (authenticated) {
        setUser(authService.getStoredUser())
      }
    }
    
    checkAuth()
    // Check auth state periodically
    const interval = setInterval(checkAuth, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
            🛡️ Cloud Shield
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
                <Link to="/logs" style={{ color: '#fff', textDecoration: 'none' }}>Logs</Link>
                <Link to="/alerts" style={{ color: '#fff', textDecoration: 'none' }}>Alerts</Link>
                <Link to="/suricata" style={{ color: '#fff', textDecoration: 'none' }}>Suricata</Link>
                <Link to="/ml" style={{ color: '#fff', textDecoration: 'none' }}>ML Detection</Link>
                {user && (
                  <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    {user.full_name}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#fff',
                    border: '1px solid #fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
                <Link to="/register" style={{ color: '#fff', textDecoration: 'none' }}>Register</Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
      <footer style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: '1rem 2rem',
        textAlign: 'center',
        marginTop: 'auto'
      }}>
        <p>Cloud Shield - Cybersecurity Monitoring System</p>
      </footer>
    </div>
  )
}

export default Layout

