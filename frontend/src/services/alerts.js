/**
 * Alerts service for API calls.
 */
import api from './auth'

export const alertsService = {
  /**
   * Create a new alert
   */
  async createAlert(alertData) {
    const response = await api.post('/alerts', alertData)
    return response.data
  },

  /**
   * Get list of alerts with optional filters
   */
  async getAlerts(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.status) params.append('status', filters.status)
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.alert_type) params.append('alert_type', filters.alert_type)

    const response = await api.get(`/alerts?${params.toString()}`)
    return response.data
  },

  /**
   * Get a specific alert by ID
   */
  async getAlert(alertId) {
    const response = await api.get(`/alerts/${alertId}`)
    return response.data
  },

  /**
   * Update an alert
   */
  async updateAlert(alertId, updateData) {
    const response = await api.patch(`/alerts/${alertId}`, updateData)
    return response.data
  },

  /**
   * Get alert count statistics
   */
  async getAlertStats(filters = {}) {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.alert_type) params.append('alert_type', filters.alert_type)

    const response = await api.get(`/alerts/stats/count?${params.toString()}`)
    return response.data
  },
}

