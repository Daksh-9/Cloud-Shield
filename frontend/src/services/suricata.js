/**
 * Suricata service for API calls.
 */
import api from './auth'

export const suricataService = {

  async getEvents(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.event_type) params.append('event_type', filters.event_type)

    const response = await api.get(`/suricata/events?${params.toString()}`)
    return response.data
  },

  // --- Rule Management ---

  async createRule(ruleContent, ruleName, severity = 'medium') {
    const response = await api.post('/suricata/rules/create', {
      rule_content: ruleContent,
      rule_name: ruleName || undefined,
      severity: severity 
    })
    return response.data
  },

  async getRecentRules(limit = 5) {
    const response = await api.get(`/suricata/rules/recent?limit=${limit}`)
    return response.data
  },

  async updateRule(lineNumber, ruleContent) {
    const response = await api.patch(`/suricata/rules/update/${lineNumber}`, {
      rule_content: ruleContent
    })
    return response.data
  },

  // --- Upload & Backup ---

  async uploadRules(file, uploadedBy) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/suricata/rules/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getBackups() {
    const response = await api.get('/suricata/rules/backups');
    return response.data;
  },

  async restoreBackup(backupId) {
    const response = await api.post(`/suricata/rules/restore/${backupId}`);
    return response.data;
  },

  // Add this  under the Backup section:
  async viewBackupFile(backupId) {
    const response = await api.get(`/suricata/rules/backups/${backupId}/view`);
    return response.data;
  },

  // --- File View ---

  async viewRulesFile(search, caseSensitive = false) {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (caseSensitive) params.append('case_sensitive', 'true')

    const response = await api.get(`/suricata/rules/view?${params.toString()}`)
    return response.data
  },

  async downloadRulesFile() {
    const response = await api.get('/suricata/rules/download', {
      responseType: 'blob'
    })
    return response.data
  },

  // --- History ---
  async getRuleHistory(limit = 50) {
    const response = await api.get(`/suricata/rules/history?limit=${limit}`);
    return response.data;
  },

  // --- Engine Management ---
  
  async reloadEngine() {
    const response = await api.post('/suricata/reload');
    return response.data;
  }
}