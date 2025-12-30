/**
 * Monitoring service for live data and WebSocket connections.
 */
import api from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')

export const monitoringService = {
  /**
   * Get current metrics
   */
  async getMetrics() {
    const response = await api.get('/monitoring/metrics')
    return response.data
  },

  /**
   * Get recent logs
   */
  async getRecentLogs(limit = 10) {
    const response = await api.get(`/monitoring/recent-logs?limit=${limit}`)
    return response.data
  },

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 10) {
    const response = await api.get(`/monitoring/recent-alerts?limit=${limit}`)
    return response.data
  },

  /**
   * Create WebSocket connection for live updates
   */
  createWebSocketConnection(token, onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/monitoring/ws?token=${token}`)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      if (onError) onError(error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      if (onClose) onClose()
    }
    
    return ws
  },
}

