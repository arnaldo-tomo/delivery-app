// src/services/LocationService.js - Versão melhorada
import * as Location from 'expo-location';
import ApiService from './ApiService';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.isTracking = false;
  }

  /**
   * ✅ OBTER LOCALIZAÇÃO ATUAL E ATUALIZAR NO SERVIDOR
   */
  async getCurrentLocation(updateServer = true) {
    try {
      console.log('📍 Solicitando permissão de localização...');
      
      // Verificar permissões
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      console.log('📍 Obtendo localização atual...');
      
      // Obter localização com alta precisão
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 10000, // 10 segundos
        timeout: 15000,    // 15 segundos timeout
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };

      console.log('✅ Localização obtida:', coords);
      
      this.currentLocation = coords;

      // ✅ ATUALIZAR LOCALIZAÇÃO NO SERVIDOR
      if (updateServer) {
        try {
          await this.updateLocationOnServer(coords.latitude, coords.longitude);
        } catch (serverError) {
          console.warn('⚠️ Erro ao atualizar localização no servidor:', serverError.message);
          // Não falhar se servidor der erro - localização local ainda é útil
        }
      }

      return coords;
      
    } catch (error) {
      console.error('❌ Erro ao obter localização:', error);
      throw error;
    }
  }

  /**
   * ✅ ATUALIZAR LOCALIZAÇÃO NO SERVIDOR
   */
  async updateLocationOnServer(latitude, longitude) {
    try {
      console.log('🌐 Atualizando localização no servidor...');
      
      const response = await ApiService.updateLocation(latitude, longitude);
      
      if (response.status === 'success') {
        console.log('✅ Localização atualizada no servidor');
        return true;
      } else {
        throw new Error(response.message || 'Erro ao atualizar localização');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar localização no servidor:', error);
      throw error;
    }
  }

  /**
   * ✅ INICIAR RASTREAMENTO CONTÍNUO
   */
  async startLocationTracking(onLocationUpdate, options = {}) {
    try {
      if (this.isTracking) {
        console.log('⚠️ Rastreamento já está ativo');
        return;
      }

      console.log('📍 Iniciando rastreamento de localização...');

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      const defaultOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,     // Atualizar a cada 10 segundos
        distanceInterval: 10,    // Ou quando mover 10 metros
        ...options
      };

      this.watchId = await Location.watchPositionAsync(
        defaultOptions,
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp
          };

          console.log('📍 Localização atualizada:', {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            accuracy: Math.round(coords.accuracy) + 'm'
          });

          this.currentLocation = coords;

          // Chamar callback
          if (onLocationUpdate) {
            onLocationUpdate(coords);
          }

          // Atualizar no servidor (throttle para evitar spam)
          this.throttledServerUpdate(coords.latitude, coords.longitude);
        }
      );

      this.isTracking = true;
      console.log('✅ Rastreamento iniciado');

    } catch (error) {
      console.error('❌ Erro ao iniciar rastreamento:', error);
      throw error;
    }
  }

  /**
   * ✅ PARAR RASTREAMENTO
   */
  async stopLocationTracking() {
    try {
      if (this.watchId) {
        await this.watchId.remove();
        this.watchId = null;
      }
      
      this.isTracking = false;
      console.log('✅ Rastreamento parado');
    } catch (error) {
      console.error('❌ Erro ao parar rastreamento:', error);
    }
  }

  /**
   * ✅ THROTTLE PARA ATUALIZAÇÃO NO SERVIDOR
   */
  throttledServerUpdate = this.throttle(async (latitude, longitude) => {
    try {
      await this.updateLocationOnServer(latitude, longitude);
    } catch (error) {
      console.warn('⚠️ Falha silenciosa ao atualizar servidor:', error.message);
    }
  }, 30000); // Máximo 1 atualização por 30 segundos

  /**
   * ✅ UTILITÁRIO: Throttle function
   */
  throttle(func, wait) {
    let timeout;
    let lastExecTime = 0;
    
    return function executedFunction(...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > wait) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, wait - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * ✅ CALCULAR DISTÂNCIA ENTRE DOIS PONTOS
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) * 
      Math.cos(this.toRad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // 2 casas decimais
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * ✅ OBTER LOCALIZAÇÃO ATUAL (sem atualizar servidor)
   */
  getCurrentLocationSync() {
    return this.currentLocation;
  }

  /**
   * ✅ VERIFICAR SE TEM LOCALIZAÇÃO
   */
  hasLocation() {
    return !!this.currentLocation;
  }

  /**
   * ✅ STATUS DO RASTREAMENTO
   */
  isCurrentlyTracking() {
    return this.isTracking;
  }

  /**
   * ✅ FORMATAR COORDENADAS PARA EXIBIÇÃO
   */
  formatCoordinates(coords, precision = 6) {
    if (!coords || !coords.latitude || !coords.longitude) {
      return 'Coordenadas não disponíveis';
    }

    return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
  }

  /**
   * ✅ VERIFICAR SE DUAS LOCALIZAÇÕES ESTÃO PRÓXIMAS
   */
  isNearby(location1, location2, maxDistanceKm = 0.1) {
    if (!location1 || !location2) return false;
    
    const distance = this.calculateDistance(location1, location2);
    return distance <= maxDistanceKm;
  }
}

export default new LocationService();