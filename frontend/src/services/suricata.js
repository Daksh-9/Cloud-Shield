/**
 * Suricata service for API calls.
 */
import api from './auth'

export const suricataService = {
  /**
   * Ingest a Suricata event
   */
  async ingestEvent(eventData) {
    const response = await api.post('/suricata/events', eventData)
    return response.data
  },

  /**
   * Ingest multiple Suricata events
   */
  async ingestEventsBatch(events) {
    const response = await api.post('/suricata/events/batch', events)
    return response.data
  },

  /**
   * Get Suricata events
   */
  async getEvents(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.event_type) params.append('event_type', filters.event_type)

    const response = await api.get(`/suricata/events?${params.toString()}`)
    return response.data
  },

  /**
   * Create a Suricata rule
   */
  async createRule(ruleData) {
    const response = await api.post('/suricata/rules', ruleData)
    return response.data
  },

  /**
   * Get Suricata rules
   */
  async getRules(enabledOnly = false) {
    const response = await api.get(`/suricata/rules?enabled_only=${enabledOnly}`)
    return response.data
  },

  /**
   * Update a Suricata rule
   */
  async updateRule(ruleId, updateData) {
    const response = await api.patch(`/suricata/rules/${ruleId}`, updateData)
    return response.data
  },

  /**
   * Delete a Suricata rule
   */
  async deleteRule(ruleId) {
    const response = await api.delete(`/suricata/rules/${ruleId}`)
    return response.data
  },

  /**
   * Create a Suricata config
   */
  async createConfig(configData) {
    const response = await api.post('/suricata/configs', configData)
    return response.data
  },

  /**
   * Get Suricata configs
   */
  async getConfigs() {
    const response = await api.get('/suricata/configs')
    return response.data
  },

  /**
   * Reload Suricata
   */
  async reload() {
    const response = await api.post('/suricata/reload')
    return response.data
  },
}

