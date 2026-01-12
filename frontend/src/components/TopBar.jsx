function TopBar({ user }) {
    return (
      <div style={{
        height: '64px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>≡</button>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Cloud Shield</span>
        </div>
  
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          <span style={{ color: '#2ecc71' }}>●</span>
          <span>OPERATIONAL</span>
          <span style={{ margin: '0 0.5rem' }}>|</span>
          <span>Last Update: Just now</span>
          <span style={{ margin: '0 0.5rem' }}>|</span>
          <span style={{ color: '#2ecc71' }}>HTTPS ✓</span>
        </div>
  
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            🔔 <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#e74c3c', color: 'white', fontSize: '0.7rem', padding: '1px 5px', borderRadius: '10px' }}>3</span>
          </div>
          <div style={{ cursor: 'pointer' }}>⚙️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              👤
            </div>
            <small>▼</small>
          </div>
        </div>
      </div>
    )
  }
  
  export default TopBar