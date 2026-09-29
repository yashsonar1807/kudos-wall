import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent response formatting
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If backend returns our standardized error response
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      success: false,
      message: error.message || 'Network error occurred',
      error: { code: 'NETWORK_ERROR' },
    });
  }
);

export const healthCheckAPI = async () => {
  return await api.get('/health');
};

export const triggerTestError = async () => {
  return await api.get('/non-existent-test-route');
};

export default api;
