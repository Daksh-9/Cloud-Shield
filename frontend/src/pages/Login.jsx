import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { authService } from '../services/auth'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)
    }
    
    // Check auth and redirect to dashboard if logged in
    if (authService.isAuthenticated()) {
      navigate('/dashboard')
    }
  }, [location, navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
    setMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await authService.login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', padding: '2rem', color: 'var(--text-primary)' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-secondary)', display: 'block', marginBottom: '1.5rem' }}>← Back to Home</Link>
        <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>Login</h1>
        
        {message && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#203221', color: '#b2fab4', borderRadius: '4px', border: '1px solid #2e7d32' }}>{message}</div>
        )}

        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#3b1a1a', color: '#ffb4a9', borderRadius: '4px', border: '1px solid #b00020' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', backgroundColor: loading ? '#ccc' : '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login