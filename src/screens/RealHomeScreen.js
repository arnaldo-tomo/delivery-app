import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
  Image
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

export default function RealHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { 
    availableOrders, 
    activeDelivery, 
    loading, 
    fetchAvailableOrders, 
    fetchMyDeliveries 
  } = useDelivery();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchAvailableOrders(),
      fetchMyDeliveries()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `MT ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getOrderStatusText = (status) => {
    const statusMap = {
      'pending': 'Pendente',
      'confirmed': 'Confirmado', 
      'preparing': 'Preparando',
      'ready': 'Pronto',
      'picked_up': 'Coletado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
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

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('RealOrderDetails', { order: item })}
    >
      {/* Header do Card */}
      <View style={styles.cardHeader}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>
            {item.restaurant?.name || 'Restaurante'}
          </Text>
          <Text style={styles.customerName}>
            {item.customer?.name || 'Cliente'}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {getOrderStatusText(item.status)}
          </Text>
        </View>
      </View>

      {/* Endereço */}
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color={colors.typography[20]} />
        <Text style={styles.address} numberOfLines={2}>
          {getDeliveryAddress(item.delivery_address)}
        </Text>
      </View>

      {/* Itens do Pedido */}
      <View style={styles.orderItems}>
        {item.items?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.menu_item?.name || 'Item'}
          </Text>
        ))}
        {item.items?.length > 2 && (
          <Text style={styles.moreItems}>
            +{item.items.length - 2} outros itens
          </Text>
        )}
      </View>

      {/* Footer do Card */}
      <View style={styles.cardFooter}>
        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={16} color={colors.secondary[100]} />
          <Text style={styles.paymentText}>
            {item.payment_method === 'cash' ? 'Dinheiro' : 
             item.payment_method === 'mpesa' ? 'M-Pesa' : 
             item.payment_method || 'Não informado'}
          </Text>
        </View>
        <Text style={styles.totalAmount}>
          {formatCurrency(item.total_amount)}
        </Text>
      </View>

      {/* Informações extras */}
      <View style={styles.extraInfo}>
        <View style={styles.extraItem}>
          <Ionicons name="time-outline" size={14} color={colors.primary[100]} />
          <Text style={styles.extraText}>
            {item.restaurant?.delivery_time_min || 30}-{item.restaurant?.delivery_time_max || 45} min
          </Text>
        </View>
        <View style={styles.extraItem}>
          <Ionicons name="receipt-outline" size={14} color={colors.primary[100]} />
          <Text style={styles.extraText}>#{item.order_number}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (activeDelivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.activeDeliveryContainer}>
          <View style={styles.activeDeliveryHeader}>
            <Ionicons name="bicycle" size={32} color={colors.primary[100]} />
            <Text style={styles.activeDeliveryTitle}>Entrega em Andamento</Text>
          </View>
          
          <View style={styles.activeDeliveryCard}>
            <View style={styles.activeOrderHeader}>
              <Text style={styles.activeOrderNumber}>
                Pedido #{activeDelivery.order_number}
              </Text>
              <View style={styles.activeStatusBadge}>
                <Text style={styles.activeStatusText}>
                  {getOrderStatusText(activeDelivery.status)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.activeCustomerName}>
              {activeDelivery.customer?.name || 'Cliente'}
            </Text>
            <Text style={styles.activeRestaurantName}>
              De: {activeDelivery.restaurant?.name || 'Restaurante'}
            </Text>
            <Text style={styles.activeAddress}>
              {getDeliveryAddress(activeDelivery.delivery_address)}
            </Text>
            
            <View style={styles.activeCardFooter}>
              <Text style={styles.activeTotal}>
                {formatCurrency(activeDelivery.total_amount)}
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.navigate('RealMapDelivery', { order: activeDelivery })}
              >
                <Ionicons name="map" size={16} color={colors.white} />
                <Text style={styles.continueButtonText}>Ver no Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name || 'Entregador'}!</Text>
          <Text style={styles.subtitle}>
            {availableOrders.length} entregas disponíveis
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color={colors.primary[100]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={availableOrders}
        renderItem={renderOrderCard}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={64} color={colors.gray[100]} />
            <Text style={styles.emptyTitle}>Nenhuma entrega disponível</Text>
            <Text style={styles.emptySubtitle}>
              {loading ? 'Carregando...' : 'Puxe para baixo para atualizar'}
            </Text>
          </View>
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  subtitle: {
    fontSize: 14,
    color: colors.typography[20],
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    padding: 24,
    gap: 16,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: colors.typography[20],
  },
  statusBadge: {
    backgroundColor: colors.primary[20],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[100],
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 18,
  },
  orderItems: {
    marginBottom: 16,
  },
  itemText: {
    fontSize: 13,
    color: colors.typography[50],
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 13,
    color: colors.typography[20],
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 12,
    color: colors.secondary[100],
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  extraInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  extraText: {
    fontSize: 12,
    color: colors.typography[50],
    fontWeight: '500',
  },
  activeDeliveryContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  activeDeliveryHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  activeDeliveryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginTop: 12,
  },
  activeDeliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.primary[20],
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeOrderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
  },
  activeStatusBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  activeCustomerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 4,
  },
  activeRestaurantName: {
    fontSize: 14,
    color: colors.typography[20],
    marginBottom: 8,
  },
  activeAddress: {
    fontSize: 14,
    color: colors.typography[50],
    marginBottom: 20,
    lineHeight: 20,
  },
  activeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.typography[20],
    textAlign: 'center',
  },
});