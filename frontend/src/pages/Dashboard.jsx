import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function Dashboard() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`)
        setHealth(response.data)
      } catch (error) {
        console.error('Failed to fetch health status:', error)
        setHealth({ status: 'error', message: 'Failed to connect to API' })
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
  }, [])

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a1a' }}>Dashboard</h1>
      
      <div style={{
        backgroundColor: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>System Status</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p><strong>Status:</strong> {health?.status || 'Unknown'}</p>
            <p><strong>Service:</strong> {health?.service || 'N/A'}</p>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#e8f4f8',
        borderRadius: '8px',
        borderLeft: '4px solid #2196F3'
      }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Phase 1: Project Foundation</h3>
        <p style={{ color: '#666' }}>
          Backend and frontend are initialized. Ready for Phase 2: Authentication.
        </p>
      </div>
    </div>
  )
}

export default Dashboard

