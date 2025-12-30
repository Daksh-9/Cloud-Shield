/**
 * ML service for API calls.
 */
import api from './auth'

export const mlService = {
  /**
   * Run ML inference on input data
   */
  async runInference(data, options = {}) {
    const response = await api.post('/ml/inference', {
      data,
      model_name: options.modelName,
      auto_create_alert: options.autoCreateAlert || false
    })
    return response.data
  },

  /**
   * Run ML inference on a log entry
   */
  async runInferenceOnLog(logId, options = {}) {
    const params = new URLSearchParams()
    if (options.modelName) params.append('model_name', options.modelName)
    if (options.autoCreateAlert) params.append('auto_create_alert', 'true')

    const response = await api.post(`/ml/inference/from-log/${logId}?${params.toString()}`)
    return response.data
  },

  /**
   * Get ML detections
   */
  async getDetections(filters = {}) {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.skip) params.append('skip', filters.skip)
    if (filters.detection_type) params.append('detection_type', filters.detection_type)
    if (filters.model_name) params.append('model_name', filters.model_name)
    if (filters.min_confidence) params.append('min_confidence', filters.min_confidence)

    const response = await api.get(`/ml/detections?${params.toString()}`)
    return response.data
  },

  /**
   * Get a specific detection by ID
   */
  async getDetection(detectionId) {
    const response = await api.get(`/ml/detections/${detectionId}`)
    return response.data
  },

  /**
   * List available ML models
   */
  async listModels() {
    const response = await api.get('/ml/models')
    return response.data
  },

  /**
   * Upload a new ML model
   */
  async uploadModel(file, modelName) {
    const formData = new FormData()
    formData.append('file', file)
    if (modelName) formData.append('model_name', modelName)

    const response = await api.post('/ml/models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },
}

