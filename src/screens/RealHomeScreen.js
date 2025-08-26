// src/screens/RealHomeScreen.js - Versão CORRIGIDA com funcionalidades de proximidade
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
  Switch,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

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
  const { 
    availableOrders, 
    activeDelivery, 
    loading, 
    fetchAvailableOrders, 
    fetchMyDeliveries 
  } = useDelivery();

  // Estados locais para funcionalidades de proximidade
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [deliveryRadius, setDeliveryRadius] = useState(5);

  // Recarregar dados ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadData();
      initializeLocation();
    }, [])
  );

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

  /**
   * Inicializar localização e permissões
   */
  const initializeLocation = async () => {
    try {
      console.log('🗺️ Solicitando permissões de localização...');
      
      // Solicitar permissões
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.warn('❌ Permissão de localização negada');
        Alert.alert(
          'Permissão Necessária',
          'Para receber pedidos próximos, você precisa permitir o acesso à localização.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Abrir Configurações', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return;
      }

      // Obter localização atual
      console.log('📍 Obtendo localização atual...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(coords);
      console.log('✅ Localização obtida:', coords);
      
      // TODO: Enviar localização para a API
      // await updateLocationOnServer(coords);
      
    } catch (error) {
      console.error('❌ Erro ao obter localização:', error);
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter sua localização. Verifique se o GPS está ativo.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Toggle status online/offline
   */
  const handleToggleOnline = async () => {
    console.log('🔄 Toggle online status:', !isOnline);

    // Verificar permissão de localização
    if (!locationPermission) {
      Alert.alert(
        'Permissão Necessária',
        'Para receber pedidos, você precisa permitir o acesso à localização.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir Configurações', 
            onPress: () => Linking.openSettings() 
          }
        ]
      );
      return;
    }

    // Verificar se tem localização atual
    if (!currentLocation) {
      Alert.alert(
        'Localização Indisponível',
        'Não foi possível obter sua localização. Verifique se o GPS está ativo.',
        [
          { text: 'Tentar Novamente', onPress: initializeLocation },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      
      if (newStatus) {
        console.log('✅ ONLINE - Buscando pedidos próximos...');
        await loadData();
        Alert.alert('Sucesso', 'Você está online! Buscando pedidos próximos...');
      } else {
        console.log('⏸️ OFFLINE');
        Alert.alert('Offline', 'Você não receberá mais pedidos.');
      }
      
      // TODO: Atualizar status na API
      
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      Alert.alert('Erro', 'Erro ao alterar status online');
      // Reverter estado em caso de erro
      setIsOnline(!isOnline);
    }
  };

  /**
   * Alterar raio de entrega
   */
  const handleRadiusChange = (newRadius) => {
    setDeliveryRadius(newRadius);
    setShowSettings(false);
    console.log('📏 Raio alterado para:', newRadius, 'km');
    
    // Recarregar pedidos com novo raio se estiver online
    if (isOnline) {
      loadData();
    }
    
    Alert.alert('Sucesso', `Raio de entrega alterado para ${newRadius}km`);
  };

  const formatCurrency = (amount) => {
    return `MT ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDistance = (distanceKm) => {
    if (!distanceKm) return '';
    
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
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
      try {
        const parsed = JSON.parse(deliveryAddress);
        return getDeliveryAddress(parsed);
      } catch {
        return deliveryAddress;
      }
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

  const renderLocationStatus = () => (
    <View style={styles.locationStatus}>
      <View style={styles.locationInfo}>
        <Ionicons 
          name={currentLocation ? "location" : "location-outline"} 
          size={16} 
          color={currentLocation ? colors.success : colors.error} 
        />
        <Text style={[
          styles.locationText,
          { color: currentLocation ? colors.success : colors.error }
        ]}>
          {currentLocation 
            ? `Localização ativa • Raio: ${deliveryRadius}km`
            : 'Localização indisponível'
          }
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowSettings(true)}
      >
        <Ionicons name="settings-outline" size={20} color={colors.typography[50]} />
      </TouchableOpacity>
    </View>
  );

  const renderOnlineToggle = () => (
    <View style={styles.onlineContainer}>
      <View style={styles.onlineInfo}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: isOnline ? colors.success : colors.gray[100] }
        ]} />
        <Text style={styles.onlineLabel}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
        <Text style={styles.onlineSubtitle}>
          {isOnline 
            ? `${availableOrders.length} entregas disponíveis` 
            : 'Ative para receber pedidos'
          }
        </Text>
      </View>
      <Switch
        value={isOnline}
        onValueChange={handleToggleOnline}
        trackColor={{ false: colors.gray[50], true: colors.success }}
        thumbColor={isOnline ? colors.white : colors.gray[20]}
      />
    </View>
  );

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('RealOrderDetails', { order: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>
            {item.restaurant?.name || 'Restaurante'}
          </Text>
          <Text style={styles.customerName}>
            {item.customer?.name || 'Cliente'}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {getOrderStatusText(item.status)}
            </Text>
          </View>
          {item.distance_km && (
            <Text style={styles.distanceText}>
              📍 {formatDistance(item.distance_km)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color={colors.typography[20]} />
        <Text style={styles.address} numberOfLines={2}>
          {getDeliveryAddress(item.delivery_address)}
        </Text>
      </View>

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

      <View style={styles.extraInfo}>
        {item.estimated_pickup_time && (
          <View style={styles.extraItem}>
            <Ionicons name="time-outline" size={14} color={colors.primary[100]} />
            <Text style={styles.extraText}>
              ~{item.estimated_pickup_time} min
            </Text>
          </View>
        )}
        <View style={styles.extraItem}>
          <Ionicons name="receipt-outline" size={14} color={colors.primary[100]} />
          <Text style={styles.extraText}>#{item.order_number}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Se há entrega ativa, mostrar tela dedicada
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name || 'Entregador'}!</Text>
          <Text style={styles.subtitle}>
            {isOnline 
              ? `${availableOrders.length} entregas disponíveis`
              : 'Fique online para receber pedidos'
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={!isOnline}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={isOnline ? colors.primary[100] : colors.gray[100]} 
          />
        </TouchableOpacity>
      </View>

      {/* Status de localização */}
      {renderLocationStatus()}

      {/* Toggle Online/Offline */}
      {renderOnlineToggle()}

      {/* Lista de pedidos ou estados vazios */}
      {!isOnline ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="power-outline" size={64} color={colors.gray[100]} />
          <Text style={styles.emptyTitle}>Você está offline</Text>
          <Text style={styles.emptySubtitle}>
            Ative o modo online para começar a receber pedidos na sua região
          </Text>
        </View>
      ) : !currentLocation ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color={colors.gray[100]} />
          <Text style={styles.emptyTitle}>Localização indisponível</Text>
          <Text style={styles.emptySubtitle}>
            Permita o acesso à localização para receber pedidos próximos
          </Text>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={initializeLocation}
          >
            <Text style={styles.locationButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
                {loading 
                  ? 'Buscando pedidos na sua região...'
                  : `Não há pedidos no raio de ${deliveryRadius}km. Tente aumentar o raio.`
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Configurações */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color={colors.typography[100]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configurações</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.settingSection}>
              <Text style={styles.settingTitle}>Raio de Entrega</Text>
              <Text style={styles.settingDescription}>
                Defina a distância máxima para receber pedidos
              </Text>
              
              {/* Botões para selecionar raio */}
              <View style={styles.radiusButtons}>
                {[1, 2, 3, 5, 8, 10, 15].map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusButton,
                      { backgroundColor: deliveryRadius === radius ? colors.primary[100] : colors.gray[20] }
                    ]}
                    onPress={() => handleRadiusChange(radius)}
                  >
                    <Text style={[
                      styles.radiusButtonText,
                      { color: deliveryRadius === radius ? colors.white : colors.typography[100] }
                    ]}>
                      {radius}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.radiusDisplay}>
                <Text style={styles.radiusValue}>{deliveryRadius}km</Text>
                <Text style={styles.radiusNote}>
                  Raio atual de entrega
                </Text>
              </View>
            </View>

            {currentLocation && (
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Sua Localização</Text>
                <Text style={styles.locationCoords}>
                  📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.settingDescription}>
                  Última atualização: agora
                </Text>
              </View>
            )}

            <View style={styles.settingSection}>
              <Text style={styles.settingTitle}>Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Online</Text>
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: colors.gray[50], true: colors.success }}
                  thumbColor={isOnline ? colors.white : colors.gray[20]}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  subtitle: {
    fontSize: 14,
    color: colors.typography[50],
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 4,
  },
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  onlineInfo: {
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  onlineLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  onlineSubtitle: {
    fontSize: 12,
    color: colors.typography[50],
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  customerName: {
    fontSize: 14,
    color: colors.typography[50],
    marginTop: 2,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: colors.primary[20],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[100],
  },
  distanceText: {
    fontSize: 12,
    color: colors.typography[50],
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: colors.typography[50],
    marginLeft: 6,
    lineHeight: 18,
  },
  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 13,
    color: colors.typography[80],
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    color: colors.typography[20],
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 12,
    color: colors.secondary[100],
    marginLeft: 4,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  extraInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraText: {
    fontSize: 11,
    color: colors.primary[100],
    marginLeft: 3,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginTop: 16,
    textAlign: 'center',
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  activeDeliveryContainer: {
    flex: 1,
    padding: 20,
  },
  activeDeliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeDeliveryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginLeft: 12,
  },
  activeDeliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeOrderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  activeStatusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    color: colors.typography[50],
    marginBottom: 8,
  },
  activeAddress: {
    fontSize: 14,
    color: colors.typography[80],
    lineHeight: 20,
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  placeholder: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.typography[50],
    marginBottom: 16,
  },
  radiusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  radiusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  radiusDisplay: {
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  radiusNote: {
    fontSize: 12,
    color: colors.typography[50],
  },
  locationCoords: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.typography[80],
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: colors.typography[80],
  },
});