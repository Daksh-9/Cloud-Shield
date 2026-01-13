import { Link, useLocation } from 'react-router-dom'

function Sidebar({ user, onLogout }) {
  const location = useLocation()
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/monitoring', label: 'Live Traffic', icon: '📈' },
    { path: '/alerts', label: 'Active Alerts', icon: '🔔' },
    { path: '/alerts/config', label: 'Alert Rules', icon: '⚙️' }, // New
    { path: '/events', label: 'Timeline', icon: '📅' },         // New
    { path: '/logs', label: 'Logs', icon: '📝' },
    { path: '/ml', label: 'ML Engine', icon: '🧠' },
    { path: '/suricata', label: 'Suricata', icon: '🛡️' },
  ]

  return (
    <div style={{ 
      width: '260px', 
      backgroundColor: '#1a1a1a', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh' // Ensure full height
    }}>
      {/* Logo Area */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #333' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛡️</span> Cloud Shield
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              color: location.pathname === item.path ? '#fff' : '#aaa',
              backgroundColor: location.pathname === item.path ? '#2196F3' : 'transparent',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
              borderLeft: location.pathname === item.path ? '4px solid white' : '4px solid transparent'
            }}
          >
            <span style={{ marginRight: '0.75rem' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid #333', backgroundColor: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            👤
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Admin User</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default Sidebar