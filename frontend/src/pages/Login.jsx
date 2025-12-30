function Login() {
  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#1a1a1a' }}>Login</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Authentication will be implemented in Phase 2.
      </p>
      <form>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
            Email
          </label>
          <input
            type="email"
            disabled
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
            Password
          </label>
          <input
            type="password"
            disabled
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        <button
          type="submit"
          disabled
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: 'not-allowed',
            opacity: 0.6
          }}
        >
          Login
        </button>
      </form>
    </div>
  )
}

export default Login

