import { Outlet, Link } from 'react-router-dom'

function Layout() {
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
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
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

