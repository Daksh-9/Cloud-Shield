/**
 * Authentication service for API calls and token management.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  // ... existing register ...
  async register(email, password, fullName) {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    })
    return response.data
  },

  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password,
    })
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
      // Store user object which contains role
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    
    return response.data
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token')
  },

  getStoredUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // --- NEW: Role Management ---
  getRole() {
    const user = this.getStoredUser();
    return user?.role || 'analyst'; 
  },

  isAdmin() {
    return this.getRole() === 'admin';
  }
}

export default api;