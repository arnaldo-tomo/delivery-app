// src/services/ApiService.js - Versão atualizada com endpoints de proximidade
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
    this.baseURL = 'http://192.168.100.3:8000/api/v1'; // Substitua pela sua URL
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('auth_token');
    }
    return this.token;
  }

  async setToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      ...options,
    };

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, data);
        throw new Error(data.message || 'Erro na requisição');
      }

      console.log(`✅ API Response: ${endpoint}`, data.status);
      return data;
    } catch (error) {
      console.error(`❌ Network Error: ${endpoint}`, error.message);
      throw error;
    }
  }

  // =============== AUTH METHODS ===============
  async login(email, password) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.log('Erro no logout (continuando mesmo assim):', error);
    } finally {
      await this.setToken(null);
    }
  }

  async getProfile() {
    return await this.makeRequest('/auth/me');
  }

  // =============== DELIVERY METHODS - ATUALIZADOS COM PROXIMIDADE ===============

  /**
   * Buscar pedidos disponíveis com filtros de proximidade
   */
  async getAvailableOrders(page = 1, filters = {}) {
    let endpoint = `/delivery/available-orders?page=${page}`;
    
    // Adicionar parâmetros de filtro
    const params = new URLSearchParams();
    
    if (filters.radius) {
      params.append('radius', filters.radius);
    }
    
    if (filters.max_orders) {
      params.append('max_orders', filters.max_orders);
    }

    if (params.toString()) {
      endpoint += `&${params.toString()}`;
    }

    return await this.makeRequest(endpoint);
  }

  /**
   * Aceitar pedido com localização
   */
  async acceptOrder(orderId, location = null) {
    const body = {};
    
    if (location) {
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }

    return await this.makeRequest(`/delivery/orders/${orderId}/accept`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Buscar minhas entregas
   */
  async getMyDeliveries(page = 1) {
    return await this.makeRequest(`/delivery/my-deliveries?page=${page}`);
  }

  /**
   * Atualizar status da entrega com localização
   */
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

  /**
   * NOVO: Atualizar localização do entregador
   */
  async updateDeliveryLocation(latitude, longitude) {
    return await this.makeRequest('/delivery/update-location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  /**
   * NOVO: Buscar estatísticas do entregador
   */
  async getDeliveryStats() {
    return await this.makeRequest('/delivery/stats');
  }

  /**
   * NOVO: Obter configurações do entregador
   */
  async getDeliverySettings() {
    return await this.makeRequest('/delivery/settings');
  }

  /**
   * NOVO: Atualizar configurações do entregador
   */
  async updateDeliverySettings(settings) {
    return await this.makeRequest('/delivery/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  /**
   * NOVO: Buscar pedidos próximos em tempo real
   */
  async getNearbyOrdersRealtime(location) {
    return await this.makeRequest('/delivery/nearby-orders-realtime', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  // =============== CUSTOMER ORDER METHODS ===============
  async getOrders(page = 1) {
    return await this.makeRequest(`/orders?page=${page}`);
  }

  async createOrder(orderData) {
    return await this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrder(orderId) {
    return await this.makeRequest(`/orders/${orderId}`);
  }

  async trackOrder(orderId) {
    return await this.makeRequest(`/orders/${orderId}/track`);
  }

  async cancelOrder(orderId) {
    return await this.makeRequest(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    });
  }

  // =============== PAYMENT METHODS ===============
  async initiateMpesaPayment(orderId, phoneNumber) {
    return await this.makeRequest(`/orders/${orderId}/payment/mpesa`, {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  async initiateEmolaPayment(orderId, phoneNumber) {
    return await this.makeRequest(`/orders/${orderId}/payment/emola`, {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  async confirmCashPayment(orderId) {
    return await this.makeRequest(`/orders/${orderId}/payment/cash`, {
      method: 'POST',
    });
  }

  async checkPaymentStatus(orderId) {
    return await this.makeRequest(`/orders/${orderId}/payment/status`);
  }

  async getPaymentMethods() {
    return await this.makeRequest('/payment/methods');
  }

  // =============== RESTAURANT METHODS ===============
  async getRestaurants(filters = {}) {
    let endpoint = '/restaurants';
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.latitude && filters.longitude) {
      params.append('latitude', filters.latitude);
      params.append('longitude', filters.longitude);
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return await this.makeRequest(endpoint);
  }

  async getRestaurant(restaurantId) {
    return await this.makeRequest(`/restaurants/${restaurantId}`);
  }

  async getRestaurantMenu(restaurantId) {
    return await this.makeRequest(`/restaurants/${restaurantId}/menu`);
  }

  // =============== USER METHODS ===============
  async updateProfile(profileData) {
    return await this.makeRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  async savePushToken(token, platform) {
    return await this.makeRequest('/user/save-push-token', {
      method: 'POST',
      body: JSON.stringify({ 
        push_token: token,
        device_platform: platform 
      }),
    });
  }

  // =============== UTILITY METHODS ===============

  /**
   * Upload de imagem (para avatar, etc.)
   */
  async uploadImage(imageUri, type = 'avatar') {
    const token = await this.getToken();
    
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `${type}_${Date.now()}.jpg`,
    });
    formData.append('type', type);

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    return await response.json();
  }

  /**
   * Verificar conectividade com a API
   */
  async checkConnectivity() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter configurações da aplicação
   */
  async getAppConfig() {
    return await this.makeRequest('/config');
  }
}

export default new ApiService();