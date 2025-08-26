// src/services/ApiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.58.104:8000/api/v1';

export const calculateDistance = (point1, point2) => {
  const R = 6371;
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

export const estimateDeliveryTime = (distanceKm, includePickup = true) => {
  const pickupTime = includePickup ? 5 : 0;
  const travelTime = distanceKm * 2;
  const deliveryTime = 3;
  return Math.round(pickupTime + travelTime + deliveryTime);
};

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      try {
        this.token = await AsyncStorage.getItem('auth_token');
      } catch (error) {
        console.error('Erro ao obter token:', error);
        this.token = null;
      }
    }
    return this.token;
  }

  async setToken(token) {
    try {
      this.token = token;
      await AsyncStorage.setItem('auth_token', token);
      console.log('Token salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      throw error;
    }
  }

  async removeToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem('auth_token');
      console.log('Token removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover token:', error);
    }
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getToken();
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString();
      endpoint = `${endpoint}${queryString ? `?${queryString}` : ''}`;
    }

    try {
      console.log(`API Request: ${config.method} ${this.baseURL}${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...config,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });
      const data = await response.json();

      console.log(`API Response (${response.status}):`, data);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token expirado, removendo...');
          await this.removeToken();
        }
        throw new Error(data.message || `Erro ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async login(email, password) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (response.status === 'success' && response.data.access_token) {
      await this.setToken(response.data.access_token);
    }

    return response;
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } finally {
      await this.removeToken();
    }
  }

  async getProfile() {
    return await this.makeRequest('/auth/me');
  }

  async updateProfile(data) {
    return await this.makeRequest('/auth/profile', {
      method: 'PATCH',
      body: data,
    });
  }

  async getAvailableDeliveryOrders(page = 1, latitude, longitude, perPage = 10) {
    if (!latitude || !longitude) {
      throw new Error('Localização obrigatória');
    }
    return await this.makeRequest('/delivery/available-orders', {
      method: 'GET',
      params: { page, per_page: perPage, latitude, longitude },
    });
  }

  async acceptDeliveryOrder(orderId) {
    return await this.makeRequest(`/delivery/orders/${orderId}/accept`, {
      method: 'POST',
    });
  }

  async getMyDeliveries(page = 1) {
    return await this.makeRequest('/delivery/my-deliveries', {
      method: 'GET',
      params: { page },
    });
  }

  async updateDeliveryStatus(orderId, status, location = null) {
    const body = { status };
    if (location) {
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }
    return await this.makeRequest(`/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      body,
    });
  }

  async updateDeliveryLocation(location) {
    return await this.makeRequest('/delivery/location', {
      method: 'POST',
      body: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  }

  async getDeliveryStats(period = 'today') {
    return await this.makeRequest('/delivery/stats', {
      method: 'GET',
      params: { period },
    });
  }
}

export default new ApiService();