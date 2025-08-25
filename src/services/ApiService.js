// src/services/ApiService.js - Versão Corrigida
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.58.104:8000/api/v1'; // Sua URL real

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
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      console.log(`API Response (${response.status}):`, data);

      if (!response.ok) {
        // Se token expirado/inválido (401), remover automaticamente
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

  // Auth methods
  async login(email, password) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Corrigir: O token vem como access_token, não token
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
      body: JSON.stringify(data),
    });
  }

  // Delivery methods
  async getAvailableOrders(page = 1) {
    return await this.makeRequest(`/delivery/available-orders?page=${page}`);
  }

  async acceptOrder(orderId) {
    return await this.makeRequest(`/delivery/orders/${orderId}/accept`, {
      method: 'POST',
    });
  }

  async getMyDeliveries(page = 1) {
    return await this.makeRequest(`/delivery/my-deliveries?page=${page}`);
  }

  async updateDeliveryStatus(orderId, status, location = null) {
    const body = { status };
    
    if (location) {
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }

    return await this.makeRequest(`/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }


   // Delivery methods - Atualizados para trabalhar com a estrutura real
   async getAvailableOrders(page = 1) {
    return await this.makeRequest(`/delivery/available-orders?page=${page}`);
  }

  async acceptOrder(orderId) {
    return await this.makeRequest(`/delivery/orders/${orderId}/accept`, {
      method: 'POST',
    });
  }

  async getMyDeliveries(page = 1) {
    return await this.makeRequest(`/delivery/my-deliveries?page=${page}`);
  }

  async updateDeliveryStatus(orderId, status, location = null) {
    const body = { status };
    
    if (location) {
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }

    return await this.makeRequest(`/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

}


export default new ApiService();