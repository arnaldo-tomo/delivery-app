// src/screens/RealHomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Switch,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import ApiService from '../services/ApiService'; // Correct import
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444',
};

export default function RealHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [stats, setStats] = useState({
    active_deliveries: 0,
    completed_today: 0,
    total_earnings_today: 0,
  });

  const locationWatchRef = useRef(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (isOnline && currentLocation) {
      loadAvailableOrders();
      const interval = setInterval(() => {
        if (isOnline && currentLocation) {
          loadAvailableOrders();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, currentLocation]);

  const initializeScreen = async () => {
    try {
      await loadMyDeliveries();
      await getCurrentLocation();
    } catch (error) {
      console.error('Erro na inicialização:', error);
      Alert.alert('Erro', 'Não foi possível inicializar a tela. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Localização Necessária',
          'Permita o acesso à localização para receber pedidos próximos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tentar Novamente', onPress: getCurrentLocation },
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);

      if (isOnline) {
        startLocationTracking();
      }

      console.log('🗺️ Localização obtida:', newLocation);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização. Tente novamente.');
    } finally {
      setLocationLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(newLocation);
          ApiService.updateDeliveryLocation(newLocation).catch((error) =>
            console.error('Erro ao atualizar localização:', error)
          );
        }
      );
    } catch (error) {
      console.error('Erro no tracking de localização:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!currentLocation) {
      Alert.alert('Erro', 'Localização necessária. Ative o GPS primeiro.');
      return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (newStatus) {
      startLocationTracking();
      loadAvailableOrders();
    } else {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
      setAvailableOrders([]);
    }
  };

  const loadAvailableOrders = async () => {
    if (!currentLocation) return;

    try {
      const response = await ApiService.getAvailableDeliveryOrders(
        1,
        currentLocation.latitude,
        currentLocation.longitude
      );
      setAvailableOrders(response.data.data || []);
      console.log(`📦 ${response.data.data?.length || 0} pedidos disponíveis`);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const loadMyDeliveries = async () => {
    try {
      const response = await ApiService.getMyDeliveries(1);
      const active = response.data.data?.find((order) =>
        ['on_way', 'picked_up'].includes(order.status)
      );
      setActiveDelivery(active);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas entregas. Tente novamente.');
    }
  };

  const handleAcceptOrder = async (order) => {
    Alert.alert(
      'Aceitar Pedido?',
      `Pedido #${order.order_number}\n` +
        `Valor: MT ${order.total_amount.toFixed(2)}\n` +
        `Distância: ${order.estimated_distance_text}\n` +
        `Restaurante: ${order.restaurant.name}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: () => acceptOrder(order.id),
        },
      ]
    );
  };

  const acceptOrder = async (orderId) => {
    try {
      const response = await ApiService.acceptDeliveryOrder(orderId);
      Alert.alert('Pedido Aceito! 🎉', response.message || 'Pedido aceito com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            loadMyDeliveries();
            loadAvailableOrders();
            navigation.navigate('DeliveryMap', { orderId });
          },
        },
      ]);
    } catch (error) {
      const message = error.message || 'Erro ao aceitar pedido';
      Alert.alert('Erro', message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadMyDeliveries(),
        isOnline && currentLocation ? loadAvailableOrders() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderOrderCard = ({ item: order }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => handleAcceptOrder(order)}>
      <LinearGradient colors={[colors.white, colors.gray[20]]} style={styles.orderCardGradient}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{order.estimated_total_time}</Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>MT {order.total_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="restaurant" size={16} color={colors.secondary[100]} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{order.restaurant.name}</Text>
            <Text style={styles.locationAddress}>{order.restaurant.address}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="home" size={16} color={colors.primary[100]} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{order.customer.name}</Text>
            <Text style={styles.locationAddress}>
              {typeof order.delivery_address === 'string'
                ? order.delivery_address
                : order.delivery_address?.street || 'Endereço não disponível'}
            </Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <View style={styles.orderStats}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={14} color={colors.gray[100]} />
              <Text style={styles.statText}>{order.estimated_distance_text}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="card" size={14} color={colors.gray[100]} />
              <Text style={styles.statText}>{order.payment_method.toUpperCase()}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bag" size={14} color={colors.gray[100]} />
              <Text style={styles.statText}>
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.acceptButton}>
            <LinearGradient
              colors={[colors.success, '#059669']}
              style={styles.acceptButtonGradient}
            >
              <Text style={styles.acceptButtonText}>Aceitar</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderActiveDelivery = () => (
    <TouchableOpacity
      style={styles.activeDeliveryCard}
      onPress={() => navigation.navigate('DeliveryMap', { orderId: activeDelivery.id })}
    >
      <LinearGradient
        colors={[colors.primary[100], colors.primary[80]]}
        style={styles.activeDeliveryGradient}
      >
        <View style={styles.activeDeliveryHeader}>
          <View style={styles.activeDeliveryIcon}>
            <Ionicons name="bicycle" size={24} color={colors.white} />
          </View>
          <View style={styles.activeDeliveryInfo}>
            <Text style={styles.activeDeliveryTitle}>Entrega em Andamento</Text>
            <Text style={styles.activeDeliverySubtitle}>
              #{activeDelivery.order_number} • MT {activeDelivery.total_amount.toFixed(2)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </View>
        <View style={styles.activeDeliveryProgress}>
          <Text style={styles.activeDeliveryStatus}>
            {getStatusText(activeDelivery.status)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getStatusText = (status) => {
    const statusTexts = {
      on_way: 'Indo buscar no restaurante',
      picked_up: 'Entregando ao cliente',
    };
    return statusTexts[status] || status;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[100]} />
          <Text style={styles.loadingText}>Carregando entregas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Olá, {user?.name || 'Entregador'}!</Text>
            <Text style={styles.subtitle}>Entregador</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text
              style={[styles.statusText, { color: isOnline ? colors.success : colors.gray[100] }]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: colors.gray[50], true: colors.success }}
              thumbColor={isOnline ? colors.white : colors.gray[100]}
            />
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completed_today}</Text>
            <Text style={styles.statLabel}>Entregas Hoje</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>MT {stats.total_earnings_today.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Ganhos Hoje</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.active_deliveries}</Text>
            <Text style={styles.statLabel}>Ativas</Text>
          </View>
        </View>
      </View>
      <View style={styles.locationStatus}>
        <View style={styles.locationStatusContent}>
          <Ionicons
            name="location"
            size={16}
            color={currentLocation ? colors.success : colors.error}
          />
          <Text style={styles.locationStatusText}>
            {currentLocation ? 'Localização ativa' : 'Localização desativada'}
          </Text>
        </View>
        {locationLoading && <ActivityIndicator size="small" color={colors.primary[100]} />}
        {!currentLocation && (
          <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
            <Text style={styles.locationButtonText}>Ativar GPS</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        style={styles.content}
        data={isOnline ? availableOrders : []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[100]]}
            tintColor={colors.primary[100]}
          />
        }
        ListHeaderComponent={
          activeDelivery ? (
            <View style={styles.activeDeliveryContainer}>
              <Text style={styles.sectionTitle}>Entrega Ativa</Text>
              {renderActiveDelivery()}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {!isOnline ? (
              <>
                <Ionicons name="power" size={80} color={colors.gray[50]} />
                <Text style={styles.emptyTitle}>Você está offline</Text>
                <Text style={styles.emptySubtitle}>
                  Ative o modo online para receber pedidos
                </Text>
              </>
            ) : !currentLocation ? (
              <>
                <Ionicons name="location-outline" size={80} color={colors.gray[50]} />
                <Text style={styles.emptyTitle}>GPS necessário</Text>
                <Text style={styles.emptySubtitle}>
                  Ative a localização para ver pedidos próximos
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="bicycle-outline" size={80} color={colors.gray[50]} />
                <Text style={styles.emptyTitle}>Nenhum pedido disponível</Text>
                <Text style={styles.emptySubtitle}>
                  Aguarde novos pedidos aparecerem na sua região
                </Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={availableOrders.length === 0 ? styles.emptyContentContainer : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.typography[50],
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 2,
    shadowColor: colors.typography[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.typography[100],
  },
  subtitle: {
    fontSize: 16,
    color: colors.typography[50],
    marginTop: 2,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.gray[20],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.typography[100],
  },
  statLabel: {
    fontSize: 12,
    color: colors.typography[50],
    marginTop: 4,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  locationStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationStatusText: {
    fontSize: 14,
    color: colors.typography[50],
  },
  locationButton: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  activeDeliveryContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.typography[100],
    marginBottom: 12,
  },
  activeDeliveryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.typography[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  activeDeliveryGradient: {
    padding: 20,
  },
  activeDeliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeDeliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeDeliveryInfo: {
    flex: 1,
  },
  activeDeliveryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  activeDeliverySubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  activeDeliveryProgress: {
    marginTop: 8,
  },
  activeDeliveryStatus: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  orderCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.typography[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderCardGradient: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.typography[100],
  },
  orderBadge: {
    backgroundColor: colors.secondary[20],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary[100],
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[100],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[20],
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[100],
  },
  locationAddress: {
    fontSize: 13,
    color: colors.typography[50],
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  orderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.typography[50],
  },
  acceptButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.typography[50],
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});