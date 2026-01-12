import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/auth'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '', // Used as Username
    agreeTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Calculate password strength
  useEffect(() => {
    const pwd = formData.password
    let strength = 0
    if (pwd.length >= 8) strength += 1
    if (/[A-Z]/.test(pwd)) strength += 1
    if (/[0-9]/.test(pwd)) strength += 1
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1
    setPasswordStrength(strength)
  }, [formData.password])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!formData.agreeTerms) {
      setError('You must agree to the Terms of Service')
      return
    }

    setLoading(true)

    try {
      // Backend expects fullName, we map Username input to it
      await authService.register(formData.email, formData.password, formData.fullName)
      navigate('/login', { state: { message: 'Registration successful! Please login.' } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#e74c3c' // Red
    if (passwordStrength <= 3) return '#f1c40f' // Yellow
    return '#2ecc71' // Green
  }

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak'
    if (passwordStrength <= 3) return 'Medium'
    return 'Strong'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '1.5rem' }}>← Back to Home</Link>
        
        <h1 style={{ marginBottom: '2rem', color: '#1a1a1a', textAlign: 'center' }}>Create Your Account</h1>
        
        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', border: '1px solid #fcc' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Username (Full Name)</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {/* Strength Meter */}
            <div style={{ marginTop: '0.5rem' }}>
                <div style={{ height: '4px', width: '100%', backgroundColor: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(passwordStrength / 4) * 100}%`, height: '100%', backgroundColor: getStrengthColor(), transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <span style={{ color: getStrengthColor() }}>Strength: {getStrengthLabel()}</span>
                </div>
            </div>
            <ul style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', listStyle: 'none', padding: 0 }}>
                <li style={{ color: formData.password.length >= 8 ? '#2ecc71' : '#ccc' }}>✓ At least 8 characters</li>
                <li style={{ color: /[A-Z]/.test(formData.password) ? '#2ecc71' : '#ccc' }}>✓ Contains uppercase</li>
                <li style={{ color: /[0-9]/.test(formData.password) ? '#2ecc71' : '#ccc' }}>✓ Contains number</li>
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', borderColor: (formData.confirmPassword && formData.password !== formData.confirmPassword) ? '#e74c3c' : '#ddd' }}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <small style={{ color: '#e74c3c' }}>Passwords do not match</small>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              id="terms"
            />
            <label htmlFor="terms" style={{ fontSize: '0.9rem', color: '#666' }}>
              I agree to Terms of Service and Privacy Policy
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: loading ? '#ccc' : '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#666' }}>
          Already have an account? <Link to="/login" style={{ color: '#2196F3', textDecoration: 'none' }}>Sign In</Link>
        </p>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#999' }}>
            🔒 Secure Registration • End-to-end encryption enabled
        </div>
      </div>
    </div>
  )
}

export default Register