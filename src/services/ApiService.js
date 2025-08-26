// src/services/ApiService.js - Versão corrigida com autenticação
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
this.baseURL = 'http://192.168.58.104:8000/api/v1'; // Substitua pela sua URL
    this.token = null;
    
    // Carregar token na inicialização
    this.loadToken();
  }

  async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('@deliveryapp:token');
      if (this.token) {
        console.log('🔑 Token carregado do storage');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar token:', error);
    }
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('@deliveryapp:token');
    }
    return this.token;
  }

  async setToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('@deliveryapp:token', token);
      console.log('✅ Token salvo no storage');
    } else {
      await AsyncStorage.removeItem('@deliveryapp:token');
      console.log('🗑️ Token removido do storage');
    }
  }

  async removeToken() {
    this.token = null;
    await AsyncStorage.removeItem('@deliveryapp:token');
    console.log('🗑️ Token removido');
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
      if (token) {
        console.log('🔐 Token enviado:', token.substring(0, 20) + '...');
      } else {
        console.log('⚠️ Nenhum token disponível');
      }
      
      const response = await fetch(url, config);
      const data = await response.json();

      console.log(`📱 API Response (${response.status}):`, data.status || data.message);

      if (!response.ok) {
        // Se token expirado/inválido (401), remover automaticamente
        if (response.status === 401) {
          console.log('❌ Token expirado/inválido, removendo...');
          await this.removeToken();
          throw new Error('Sua sessão expirou. Faça login novamente.');
        }
        
        console.error(`❌ API Error ${response.status}:`, data);
        throw new Error(data.message || `Erro na requisição: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message.includes('Network request failed')) {
        console.error(`❌ Network Error: ${endpoint} - Verifique se o servidor está rodando`);
        throw new Error('Erro de conexão. Verifique sua internet e se o servidor está rodando.');
      }
      
      console.error(`❌ Request Error: ${endpoint}`, error.message);
      throw error;
    }
  }

  // =============== AUTH METHODS ===============
  async login(email, password) {
    try {
      console.log('🔐 Fazendo login para:', email);
      
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('📋 Resposta completa do login:', response);

      // Verificar estrutura da resposta Laravel
      if (response.status === 'success') {
        // Extrair token da resposta
        let token = null;
        let userData = null;
console.log('🔍 Analisando resposta do login...',response.data);
        // Tentar diferentes estruturas de resposta
        if (response.data) {
          if (response.data.token) {
            // Estrutura: { status, data: { token, user } }
            token = response.data.token;
            userData = response.data.user || response.data;
          } else if (response.token) {
            // Estrutura: { status, token, user }
            token = response.token;
            userData = response.user || response.data;
          }
        } else if (response.token) {
          // Estrutura direta: { status, token, user }
          token = response.token;
          userData = response.user;
        }

        if (token) {
          await this.setToken(token);
          console.log('✅ Login bem-sucedido, token salvo');
          
          return {
            status: 'success',
            data: {
              user: userData,
              token: token
            }
          };
        } else {
          console.error('❌ Token não encontrado na resposta:', response);
          throw new Error('Token de acesso não recebido do servidor');
        }
      } else {
        console.log('❌ Login falhou:', response.message);
        return response;
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  async logout() {
    try {
      console.log('🚪 Fazendo logout...');
      
      // Tentar fazer logout no servidor
      try {
        await this.makeRequest('/auth/logout', { method: 'POST' });
        console.log('✅ Logout no servidor OK');
      } catch (error) {
        console.log('⚠️ Erro no logout do servidor (continuando):', error.message);
      }
      
      // Sempre remover token local
      await this.removeToken();
      console.log('✅ Logout local concluído');
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Forçar remoção do token mesmo com erro
      await this.removeToken();
      throw error;
    }
  }

  async getProfile() {
    return await this.makeRequest('/auth/me');
  }

  async updateProfile(profileData) {
    return await this.makeRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  // =============== DELIVERY METHODS ===============
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

  async updateDeliveryLocation(latitude, longitude) {
    return await this.makeRequest('/delivery/update-location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  async getDeliveryStats() {
    return await this.makeRequest('/delivery/stats');
  }

  async getDeliverySettings() {
    return await this.makeRequest('/delivery/settings');
  }

  async updateDeliverySettings(settings) {
    return await this.makeRequest('/delivery/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // =============== UTILITY METHODS ===============

  /**
   * Verificar se o usuário está autenticado
   */
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Debug - mostrar informações de autenticação
   */
  async debugAuth() {
    const token = await this.getToken();
    console.log('🔍 DEBUG AUTH:');
    console.log('  Token exists:', !!token);
    console.log('  Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    
    try {
      const response = await this.getProfile();
      console.log('  Profile check:', response.status);
    } catch (error) {
      console.log('  Profile error:', error.message);
    }
  }

  /**
   * Limpar todos os dados (para debug)
   */
  async clearAllData() {
    await this.removeToken();
    console.log('🧹 Todos os dados limpos');
  }
}

export default new ApiService();