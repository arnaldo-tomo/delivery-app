// src/context/DeliveryContext.js - Versão atualizada com lógica de proximidade
import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import LocationService from '../services/LocationService';
import * as Location from 'expo-location';

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  // Estados principais
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados de localização e proximidade
  const [currentLocation, setCurrentLocation] = useState(null);
  const [deliveryRadius, setDeliveryRadius] = useState(5); // km
  const [isOnline, setIsOnline] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  
  // Estados de configuração
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    radiusKm: 5,
  });

  // Inicializar localização ao carregar
  useEffect(() => {
    initializeLocation();
    return () => {
      LocationService.stopLocationTracking();
    };
  }, []);

  // Auto-refresh de pedidos quando online
  useEffect(() => {
    let interval;
    if (isOnline && settings.autoRefresh) {
      interval = setInterval(() => {
        fetchAvailableOrders();
      }, 30000); // Atualizar a cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, settings.autoRefresh]);

  /**
   * Inicializar serviço de localização
   */
  const initializeLocation = async () => {
    try {
      console.log('🗺️ Inicializando serviço de localização...');
      
      // Solicitar permissões
      const permission = await LocationService.requestPermissions();
      setLocationPermission(permission);
      
      if (permission) {
        // Obter localização atual
        const location = await LocationService.getCurrentLocation();
        setCurrentLocation(location);
        
        // Atualizar localização na API
        await updateLocationOnServer(location);
        
        console.log('✅ Localização inicializada:', location);
        
        // Iniciar tracking contínuo
        startLocationTracking();
      } else {
        console.warn('❌ Permissão de localização negada');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar localização:', error);
    }
  };

  /**
   * Iniciar tracking de localização contínuo
   */
  const startLocationTracking = async () => {
    try {
      await LocationService.startLocationTracking((location) => {
        setCurrentLocation(location);
        
        // Atualizar na API a cada mudança significativa
        updateLocationOnServer(location);
        
        // Se houver entrega ativa, atualizar status com localização
        if (activeDelivery) {
          updateDeliveryStatus(activeDelivery.id, activeDelivery.status, location);
        }
      });
    } catch (error) {
      console.error('Erro no tracking de localização:', error);
    }
  };

  /**
   * Atualizar localização no servidor
   */
  const updateLocationOnServer = async (location) => {
    try {
      await ApiService.updateDeliveryLocation(location.latitude, location.longitude);
    } catch (error) {
      console.error('Erro ao atualizar localização no servidor:', error);
    }
  };

  /**
   * Buscar pedidos disponíveis com filtro de proximidade
   */
  const fetchAvailableOrders = async (customRadius = null) => {
    if (!currentLocation) {
      console.log('⚠️ Localização não disponível para buscar pedidos');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Buscando pedidos disponíveis...');
      
      const radius = customRadius || deliveryRadius;
      const response = await ApiService.getAvailableOrders(1, {
        radius: radius,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      if (response.status === 'success') {
        const orders = response.data || [];
        console.log(`✅ ${orders.length} pedidos encontrados no raio de ${radius}km`);
        
        // Ordenar por distância (mais próximos primeiro)
        const sortedOrders = orders.sort((a, b) => {
          return (a.distance_km || 0) - (b.distance_km || 0);
        });
        
        setAvailableOrders(sortedOrders);
        
        // Mostrar notificação para novos pedidos
        if (orders.length > availableOrders.length && isOnline) {
          notifyNewOrders(orders.length - availableOrders.length);
        }
      } else {
        console.error('❌ Erro na resposta:', response.message);
        setAvailableOrders([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos disponíveis:', error);
      setAvailableOrders([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar minhas entregas
   */
  const fetchMyDeliveries = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getMyDeliveries();
      if (response.status === 'success') {
        const deliveries = response.data.data || [];
        console.log('📦 Minhas entregas carregadas:', deliveries.length);
        
        setMyDeliveries(deliveries);
        
        // Encontrar entrega ativa
        const active = deliveries.find(d => 
          d.status === 'picked_up' || 
          (d.status !== 'delivered' && d.status !== 'cancelled' && d.delivery_person_id)
        );
        
        setActiveDelivery(active || null);
        
        if (active) {
          console.log('🚚 Entrega ativa:', active.order_number);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar minhas entregas:', error);
      setMyDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Aceitar pedido com validação de proximidade
   */
  const acceptOrder = async (orderId) => {
    if (!currentLocation) {
      return { 
        success: false, 
        error: 'Localização não disponível. Ative o GPS e tente novamente.' 
      };
    }

    try {
      console.log('✋ Tentando aceitar pedido:', orderId);
      
      const response = await ApiService.acceptOrder(orderId, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      if (response.status === 'success') {
        console.log('✅ Pedido aceito:', response.data.order.order_number);
        
        // Remover da lista de disponíveis
        setAvailableOrders(prev => prev.filter(order => order.id !== orderId));
        
        // Definir como entrega ativa
        setActiveDelivery(response.data.order);
        
        // Atualizar lista de minhas entregas
        await fetchMyDeliveries();
        
        return { success: true, order: response.data.order };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao aceitar pedido:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Atualizar status da entrega com localização
   */
  const updateDeliveryStatus = async (orderId, status, location = null) => {
    try {
      const currentLoc = location || currentLocation;
      console.log('📱 Atualizando status para:', status, 'Pedido:', orderId);
      
      const response = await ApiService.updateDeliveryStatus(orderId, status, currentLoc);
      
      if (response.status === 'success') {
        console.log('✅ Status atualizado com sucesso');
        
        // Atualizar entrega ativa
        if (activeDelivery && activeDelivery.id === orderId) {
          setActiveDelivery(response.data.order);
        }
        
        // Se entregue, limpar entrega ativa e buscar novos pedidos
        if (status === 'delivered') {
          setActiveDelivery(null);
          await fetchAvailableOrders(); // Buscar novos pedidos
        }
        
        // Atualizar lista de entregas
        await fetchMyDeliveries();
        
        return { success: true, order: response.data.order };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Alternar status online/offline
   */
  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      console.log('🔄 Alterando status para:', newStatus ? 'ONLINE' : 'OFFLINE');
      
      // Atualizar no servidor
      const response = await ApiService.updateDeliverySettings({
        status_online: newStatus
      });
      
      if (response.status === 'success') {
        setIsOnline(newStatus);
        
        if (newStatus) {
          // Ao ficar online, buscar pedidos imediatamente
          await fetchAvailableOrders();
          console.log('✅ Você está ONLINE - buscando pedidos...');
        } else {
          // Ao ficar offline, limpar pedidos disponíveis
          setAvailableOrders([]);
          console.log('⏸️ Você está OFFLINE');
        }
        
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Atualizar raio de entrega
   */
  const updateDeliveryRadius = async (newRadius) => {
    try {
      console.log('📏 Atualizando raio para:', newRadius, 'km');
      
      const response = await ApiService.updateDeliverySettings({
        raio_entrega: newRadius
      });
      
      if (response.status === 'success') {
        setDeliveryRadius(newRadius);
        
        // Buscar pedidos com novo raio
        if (isOnline) {
          await fetchAvailableOrders(newRadius);
        }
        
        console.log('✅ Raio atualizado para:', newRadius, 'km');
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar raio:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Buscar estatísticas do entregador
   */
  const fetchDeliveryStats = async () => {
    try {
      const response = await ApiService.getDeliveryStats();
      
      if (response.status === 'success') {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Calcular distância até o pedido
   */
  const calculateDistanceToOrder = (order) => {
    if (!currentLocation || !order.restaurant) return null;
    
    return LocationService.calculateDistance(
      currentLocation,
      {
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude
      }
    );
  };

  /**
   * Verificar se pedido está dentro do raio
   */
  const isOrderInRange = (order) => {
    const distance = calculateDistanceToOrder(order);
    return distance ? distance <= deliveryRadius : false;
  };

  /**
   * Mostrar notificação de novos pedidos
   */
  const notifyNewOrders = (count) => {
    // Implementar notificação push ou local
    console.log(`🔔 ${count} novo(s) pedido(s) disponível(is) na sua região!`);
  };

  /**
   * Obter pedidos próximos em tempo real
   */
  const getNearbyOrdersRealtime = async () => {
    if (!isOnline || !currentLocation) return;

    try {
      const response = await ApiService.getNearbyOrdersRealtime({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });

      if (response.status === 'success') {
        const newOrders = response.data.pedidos_novos || [];
        
        if (newOrders.length > 0) {
          console.log('🆕 Novos pedidos em tempo real:', newOrders.length);
          setAvailableOrders(prev => {
            const combined = [...prev, ...newOrders];
            // Remover duplicatas
            const unique = combined.filter((order, index, self) => 
              index === self.findIndex(o => o.id === order.id)
            );
            // Ordenar por distância
            return unique.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
          });
          
          notifyNewOrders(newOrders.length);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos em tempo real:', error);
    }
  };

  // Valores do contexto
  const value = {
    // Estados principais
    availableOrders,
    myDeliveries,
    activeDelivery,
    loading,
    
    // Estados de localização
    currentLocation,
    deliveryRadius,
    isOnline,
    locationPermission,
    settings,
    
    // Funções principais
    fetchAvailableOrders,
    fetchMyDeliveries,
    acceptOrder,
    updateDeliveryStatus,
    
    // Funções de configuração
    toggleOnlineStatus,
    updateDeliveryRadius,
    fetchDeliveryStats,
    
    // Utilitários
    calculateDistanceToOrder,
    isOrderInRange,
    getNearbyOrdersRealtime,
    
    // Funções de localização
    initializeLocation,
    startLocationTracking,
    updateLocationOnServer,
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};