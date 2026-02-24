/**
 * User service for profile and settings API calls.
 */
import api from './auth'

export const userService = {
  /**
   * Get user profile
   */
  async getProfile() {
    const response = await api.get('/user/profile')
    return response.data
  },

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    const response = await api.patch('/user/profile', profileData)
    return response.data
  },

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response.data
  },

  /**
   * Get user settings
   */
  async getSettings() {
    const response = await api.get('/user/settings')
    return response.data
  },

  /**
   * Update user settings
   */
  async updateSettings(settingsData) {
    const response = await api.patch('/user/settings', settingsData)
    return response.data
  },

  /**
   * Get user activities
   */
  async getActivities(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.activity_type) params.append('activity_type', filters.activity_type)

    const response = await api.get(`/user/activities?${params.toString()}`)
    return response.data
  },

  /**
   * Get user sessions
   */
  async getSessions() {
    const response = await api.get('/user/sessions')
    return response.data
  },

  /**
   * Revoke a session
   */
  async revokeSession(sessionId) {
    const response = await api.delete(`/user/sessions/${sessionId}`)
    return response.data
  },

  /**
   * Revoke all sessions
   */
  async revokeAllSessions() {
    const response = await api.post('/user/sessions/revoke-all')
    return response.data
  },

  /**
   * Delete account
   */
  async deleteAccount() {
    const response = await api.delete('/user/account')
    return response.data
  },

  /**
   * Admin: Get all users
   */
  async getAllUsers(skip = 0, limit = 100) {
    const response = await api.get(`/user/all?skip=${skip}&limit=${limit}`)
    return response.data
  },

  /**
   * Admin: Deactivate a user account
   */
  async deactivateUser(userId) {
    const response = await api.delete(`/user/${userId}/deactivate`)
    return response.data
  },

  /**
   * Admin: Reactivate a user account
   */
  async reactivateUser(userId) {
    const response = await api.patch(`/user/${userId}/reactivate`)
    return response.data
  },
}