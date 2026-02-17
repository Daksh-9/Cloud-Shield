// frontend/src/services/notifications.js
import api from './auth';

export const notificationService = {
  // Fetch recent alerts to display as notifications
  async getNotifications(limit = 20) {
    // We treat 'open' or 'new' alerts as unread notifications for this example
    const response = await api.get(`/alerts?limit=${limit}&sort_by=created_at&order=desc`);
    return response.data.map(alert => ({
      id: alert.id,
      type: alert.severity, // critical, high, medium, low
      title: alert.title,
      message: alert.description,
      time: alert.created_at,
      read: alert.status === 'resolved' || alert.status === 'closed', // Logic: resolved = read
      source: alert.source
    }));
  },

  // Get count of unread (open) alerts
  async getUnreadCount() {
    const response = await api.get('/alerts/stats/count?status=open');
    return response.data.count;
  },

  // Mark all as read (In this context, we might batch update status to 'acknowledged')
  async markAllAsRead() {
    // This would require a backend endpoint to batch update. 
    // For now, we simulate success or implement a loop if backend supports it.
    // Ideally: await api.post('/alerts/mark-all-read');
    return true; 
  }
};