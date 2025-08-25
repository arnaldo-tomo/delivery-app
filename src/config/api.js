// src/config/api.js
const API_BASE_URL = 'http://192.168.100.6:2021/api/v1'; // Substitua pela sua URL real

export const api = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    me: `${API_BASE_URL}/auth/me`,
  },
  
  // Delivery endpoints (baseado nas suas rotas)
  delivery: {
    availableOrders: `${API_BASE_URL}/delivery/available-orders`,
    acceptOrder: (orderId) => `${API_BASE_URL}/delivery/orders/${orderId}/accept`,
    myDeliveries: `${API_BASE_URL}/delivery/my-deliveries`,
    updateStatus: (orderId) => `${API_BASE_URL}/delivery/orders/${orderId}/status`,
  }
};

