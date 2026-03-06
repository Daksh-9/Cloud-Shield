import { Link } from 'react-router-dom'
import { authService } from '../services/auth'

function Landing() {
  const createAdminAccount = async () => {
    try {
      const adminEmail = "admin@cloudshield.com";
      const adminPass = "AdminSecure123!";
      const adminName = "System Administrator";

      const result = await authService.register(
        adminEmail, 
        adminPass, 
        adminName, 
        'admin'
      );
      
      alert(`Admin account created successfully for ${result.email}`);
    } catch (error) {
      alert(`Registration failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Hero Section */}
      <header style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '1rem 2rem' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛡️</span> Cloud Shield
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>Sign In</Link>
            <Link to="/register" style={{ backgroundColor: '#2196F3', color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>Get Started</Link>
          </div>
        </nav>
      </header>

      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>CLOUD SHIELD</h1>
            <p style={{ fontSize: '1.5rem', color: '#ccc', marginBottom: '2rem' }}>DDoS Protection for Cloud Infrastructure</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/login" style={{ padding: '0.75rem 2rem', border: '1px solid white', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Sign In</Link>
              <Link to="/register" style={{ padding: '0.75rem 2rem', backgroundColor: '#2196F3', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Get Started</Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{ maxWidth: '1200px', margin: '-3rem auto 0', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <FeatureCard 
            title="Real-Time Monitoring" 
            desc="Track network traffic and anomalies as they happen with our advanced dashboard." 
          />
          <FeatureCard 
            title="ML-Powered Detection" 
            desc="Utilize machine learning algorithms to identify and block sophisticated threats." 
          />
          <FeatureCard 
            title="Suricata Integration" 
            desc="Deep packet inspection and intrusion detection powered by Suricata engine." 
          />
        </div>
        
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          {/* Hidden Admin Trigger */}
          <button 
            onClick={createAdminAccount}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.8rem', 
              color: '#ccc', 
              background: 'none', 
              border: '1px dashed #e0e0e0', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            System Initialization
          </button>
          <h3>Secure • Scalable • Intelligent</h3>
        </div>
      </main>

      <footer style={{ backgroundColor: '#1a1a1a', color: '#666', padding: '2rem', textAlign: 'center' }}>
        <p>&copy; 2024 Cloud Shield - Cybersecurity Monitoring System</p>
      </footer>
    </div>
  )
}

function FeatureCard({ title, desc }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</p>
    </div>
  )
}

export default Landing