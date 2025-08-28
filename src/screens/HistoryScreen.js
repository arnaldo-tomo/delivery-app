// src/screens/HistoryScreen.js - VERSÃO CORRIGIDA E FUNCIONAL
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

export default function HistoryScreen() {
  const { myDeliveries, loading, fetchMyDeliveries } = useDelivery();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);

  useEffect(() => {
    loadDeliveries();
  }, []);

  useEffect(() => {
    // Filtrar apenas entregas concluídas ou canceladas
    const completed = myDeliveries.filter(delivery => 
      delivery.status === 'delivered' || delivery.status === 'cancelled'
    );
    console.log('Entregas concluídas filtradas:', completed.length);
    setCompletedDeliveries(completed);
  }, [myDeliveries]);

  const loadDeliveries = async () => {
    try {
      console.log('Carregando histórico de entregas...');
      await fetchMyDeliveries();
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'MT 0.00';
    return `MT ${parseFloat(amount).toFixed(2)}`;
  };

  const getDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return 'Endereço não disponível';
    
    if (typeof deliveryAddress === 'string') {
      return deliveryAddress;
    }
    
    if (typeof deliveryAddress === 'object') {
      const parts = [];
      if (deliveryAddress.street) parts.push(deliveryAddress.street);
      if (deliveryAddress.neighborhood) parts.push(deliveryAddress.neighborhood);
      if (deliveryAddress.city) parts.push(deliveryAddress.city);
      return parts.join(', ') || 'Endereço não disponível';
    }
    
    return 'Endereço não disponível';
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'delivered':
        return {
          icon: 'checkmark-circle',
          text: 'Entregue',
          color: colors.primary[100],
          bgColor: colors.primary[20]
        };
      case 'cancelled':
        return {
          icon: 'close-circle',
          text: 'Cancelado',
          color: '#EF4444',
          bgColor: '#FEF2F2'
        };
      default:
        return {
          icon: 'time',
          text: 'Concluído',
          color: colors.gray[100],
          bgColor: colors.gray[20]
        };
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'mpesa':
        return 'M-Pesa';
      case 'emola':
        return 'E-Mola';
      case 'cash':
        return 'Dinheiro';
      default:
        return method || 'Não informado';
    }
  };

  const renderHistoryItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {formatDate(item.delivered_at || item.created_at)}
          </Text>
        </View>

        <View style={styles.deliveryInfo}>
          <Text style={styles.orderNumber}>
            Pedido #{item.order_number}
          </Text>
          <Text style={styles.restaurantName}>
            {item.restaurant?.name || 'Restaurante'}
          </Text>
          <Text style={styles.customerName}>
            Para: {item.customer?.name || 'Cliente'}
          </Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={14} color={colors.typography[50]} />
            <Text style={styles.address} numberOfLines={2}>
              {getDeliveryAddress(item.delivery_address)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.paymentInfo}>
            <Ionicons 
              name={item.payment_method === 'cash' ? 'cash' : 'card'} 
              size={16} 
              color={colors.secondary[100]} 
            />
            <Text style={styles.paymentMethod}>
              {getPaymentMethodText(item.payment_method)}
            </Text>
          </View>
          <Text style={styles.totalAmount}>
            {formatCurrency(item.total_amount)}
          </Text>
        </View>

        {/* Informações extras se disponíveis */}
        {item.items && item.items.length > 0 && (
          <View style={styles.itemsInfo}>
            <Text style={styles.itemsCount}>
              {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
            </Text>
            <Text style={styles.firstItem} numberOfLines={1}>
              {item.items[0]?.menu_item?.name || 'Item'}
              {item.items.length > 1 && ` +${item.items.length - 1} outros`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.gray[100]} />
      <Text style={styles.emptyTitle}>Nenhuma entrega concluída</Text>
      <Text style={styles.emptySubtitle}>
        Suas entregas concluídas aparecerão aqui
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Atualizar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="hourglass-outline" size={64} color={colors.primary[100]} />
      <Text style={styles.emptyTitle}>Carregando histórico...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Entregas</Text>
        <Text style={styles.headerSubtitle}>
          {completedDeliveries.length} {completedDeliveries.length === 1 ? 'entrega concluída' : 'entregas concluídas'}
        </Text>
      </View>

      <FlatList
        data={completedDeliveries}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[100]]}
            tintColor={colors.primary[100]}
          />
        }
        ListEmptyComponent={loading ? renderLoadingState : renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
    shadowColor: colors.typography[100],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: colors.typography[50],
  },
  deliveryInfo: {
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[100],
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: colors.typography[50],
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
    paddingTop: 12,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary[20],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  paymentMethod: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary[100],
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  itemsInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 4,
  },
  firstItem: {
    fontSize: 12,
    color: colors.typography[50],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});