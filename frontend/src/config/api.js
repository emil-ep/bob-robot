// API Configuration
const API_BASE_URL = window.ENV?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost';

export const API_ENDPOINTS = {
  INVENTORY_SERVICE: `${API_BASE_URL}:3001`,
  ORDER_SERVICE: `${API_BASE_URL}:3002`,
  USER_SERVICE: `${API_BASE_URL}:3003`,
}

export default API_ENDPOINTS

// Made with Bob
