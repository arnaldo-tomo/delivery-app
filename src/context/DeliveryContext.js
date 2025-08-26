// src/context/DeliveryContext.js - Atualizado para trabalhar com dados reais
import React, { createContext, useContext, useState } from 'react';
import ApiService from '../services/ApiService';

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAvailableOrders = async () => {
    setLoading(true);
    try {  
      const response = await ApiService.getAvailableOrders();
      if (response.status === 'success') {
        console.log('Pedidos disponíveis ca÷rrregados:', response.data.data?.length || 0);
        console.log('Pedidos disponíveis: nrh', response.data.data);
        setAvailableOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos disponíveis:', error);
      setAvailableOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyDeliveries = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getMyDeliveries();
      if (response.status === 'success') {
        const deliveries = response.data.data || [];
        console.log('Minhas entregas carregadas:', deliveries.length);
        setMyDeliveries(deliveries);
        
        // Encontrar entrega ativa
        const active = deliveries.find(d => 
          d.status === 'picked_up' || 
          (d.status !== 'delivered' && d.status !== 'cancelled')
        );
        setActiveDelivery(active || null);
        
        if (active) {
          console.log('Entrega ativa encontrada:', active.order_number);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar minhas entregas:', error);
      setMyDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      console.log('Tentando aceitar pedido:', orderId);
      const response = await ApiService.acceptOrder(orderId);
      
      if (response.status === 'success') {
        console.log('Pedido aceito com sucesso:', response.data.order.order_number);
        
        // Remover da lista de disponíveis
        setAvailableOrders(prev => prev.filter(order => order.id !== orderId));
        
        // Definir como entrega ativa
        setActiveDelivery(response.data.order);
        
        // Atualizar lista de minhas entregas
        await fetchMyDeliveries();
        
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      return { success: false, error: error.message };
    }
  };

  const updateDeliveryStatus = async (orderId, status, location = null) => {
    try {
      console.log('Atualizando status para:', status, 'Pedido:', orderId);
      const response = await ApiService.updateDeliveryStatus(orderId, status, location);
      
      if (response.status === 'success') {
        console.log('Status atualizado com sucesso');
        
        // Atualizar entrega ativa
        if (activeDelivery && activeDelivery.id === orderId) {
          setActiveDelivery(response.data.order);
        }
        
        // Se entregue, limpar entrega ativa
        if (status === 'delivered') {
          setActiveDelivery(null);
        }
        
        // Atualizar lista de entregas
        await fetchMyDeliveries();
        
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    availableOrders,
    myDeliveries,
    activeDelivery,
    loading,
    fetchAvailableOrders,
    fetchMyDeliveries,
    acceptOrder,
    updateDeliveryStatus
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};