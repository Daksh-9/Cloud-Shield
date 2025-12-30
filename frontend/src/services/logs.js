/**
 * Logs service for API calls.
 */
import api from './auth'

export const logsService = {
  /**
   * Ingest a new log entry
   */
  async createLog(logData) {
    const response = await api.post('/logs', logData)
    return response.data
  },

  /**
   * Get list of logs with optional filters
   */
  async getLogs(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.source) params.append('source', filters.source)
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.log_type) params.append('log_type', filters.log_type)

    const response = await api.get(`/logs?${params.toString()}`)
    return response.data
  },

  /**
   * Get a specific log by ID
   */
  async getLog(logId) {
    const response = await api.get(`/logs/${logId}`)
    return response.data
  },

  /**
   * Get log count statistics
   */
  async getLogStats(filters = {}) {
    const params = new URLSearchParams()
    if (filters.source) params.append('source', filters.source)
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.log_type) params.append('log_type', filters.log_type)

    const response = await api.get(`/logs/stats/count?${params.toString()}`)
    return response.data
  },
}

