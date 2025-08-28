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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import ApiService from '../services/ApiService';

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
useFocusEffect( useCallback(() => { loadData(); initializeLocation(); }, []) );

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
   * FUNÇÃO CORRIGIDA: Enviar localização para API
   */
  const updateLocationOnServer = async (location, radius = null) => {
    try {
      console.log('📤 Enviando localização para servidor:', location);
      
      const result = await ApiService.updateLocation(
        location.latitude, 
        location.longitude, 
        radius
      );
      
      if (result.status === 'success') {
        console.log('✅ Localização atualizada no servidor');
        return true;
      } else {
        console.warn('⚠️ Falha ao atualizar localização:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar localização:', error);
      return false;
    }
  };

  /**
   * Toggle status online/offline - VERSÃO CORRIGIDA
   */
  const handleToggleOnline = async () => {
    console.log('🔄 Toggle online status:', !isOnline);

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
      
      if (newStatus) {
        console.log('🚀 FICANDO ONLINE - Enviando localização...');
        
        // CRUCIAL: Enviar localização atual para o servidor
        const locationUpdated = await updateLocationOnServer(currentLocation, deliveryRadius);
        
        if (!locationUpdated) {
          Alert.alert(
            'Erro',
            'Não foi possível atualizar sua localização no servidor. Tente novamente.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Agora buscar pedidos com a localização atualizada
        await loadData();
        
        setIsOnline(true);
        Alert.alert('Sucesso', 'Você está online! Buscando pedidos próximos...');
        
      } else {
        console.log('⏸️ FICANDO OFFLINE');
        setIsOnline(false);
        Alert.alert('Offline', 'Você não receberá mais pedidos.');
      }
      
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      Alert.alert('Erro', 'Erro ao alterar status online: ' + error.message);
    }
  };

  /**
   * Alterar raio de entrega - VERSÃO CORRIGIDA
   */
  const handleRadiusChange = async (newRadius) => {
    try {
      console.log('📏 Alterando raio para:', newRadius, 'km');
      
      // Se estiver online e com localização, enviar para servidor
      if (isOnline && currentLocation) {
        const updated = await updateLocationOnServer(currentLocation, newRadius);
        if (!updated) {
          Alert.alert('Erro', 'Não foi possível atualizar o raio no servidor');
          return;
        }
        
        // Recarregar pedidos com novo raio
        await loadData();
      }
      
      setDeliveryRadius(newRadius);
      setShowSettings(false);
      
      Alert.alert('Sucesso', `Raio de entrega alterado para ${newRadius}km`);
    } catch (error) {
      console.error('❌ Erro ao alterar raio:', error);
      Alert.alert('Erro', 'Erro ao alterar raio: ' + error.message);
    }
  };

  /**
   * FUNÇÕES DE FORMATAÇÃO OTIMIZADAS
   */
  
  const formatCurrency = (amount) => {
    if (!amount) return 'MT 0,00';
    const numAmount = parseFloat(amount);
    return `MT ${numAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDistance = (distanceKm) => {
    if (!distanceKm) return '';
    
    const distance = parseFloat(distanceKm);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getOrderStatusText = (status) => {
    const statusMap = {
      'pending': 'Aguardando',
      'confirmed': 'Confirmado', 
      'preparing': 'Preparando',
      'ready': 'Pronto para Coleta',
      'picked_up': 'Coletado',
      'out_for_delivery': 'Saiu para Entrega',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status?.toUpperCase() || 'N/A';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': colors.secondary[50],
      'confirmed': colors.secondary[100], 
      'preparing': colors.secondary[100],
      'ready': colors.success,
      'picked_up': colors.primary[100],
      'out_for_delivery': colors.primary[100],
      'delivered': colors.success,
      'cancelled': colors.error
    };
    return colorMap[status] || colors.gray[100];
  };

  /**
   * Função otimizada para extrair endereço de entrega
   */
  const getDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return 'Endereço não disponível';
    
    // Se for string, tentar fazer parse do JSON
    if (typeof deliveryAddress === 'string') {
      try {
        const parsed = JSON.parse(deliveryAddress);
        return getDeliveryAddress(parsed);
      } catch {
        return deliveryAddress;
      }
    }
    
    // Se for objeto, extrair componentes
    if (typeof deliveryAddress === 'object') {
      const parts = [];
      
      // Verificar diferentes estruturas possíveis
      if (deliveryAddress.street) {
        // Se street for objeto ou array
        if (typeof deliveryAddress.street === 'object') {
          if (Array.isArray(deliveryAddress.street)) {
            parts.push(...deliveryAddress.street.filter(Boolean));
          } else {
            // Se street for um objeto, tentar extrair valores
            Object.values(deliveryAddress.street).forEach(val => {
              if (val && typeof val === 'string') parts.push(val);
            });
          }
        } else {
          parts.push(deliveryAddress.street);
        }
      }
      
      // Adicionar outros campos
      if (deliveryAddress.neighborhood) parts.push(deliveryAddress.neighborhood);
      if (deliveryAddress.district) parts.push(deliveryAddress.district);
      if (deliveryAddress.city) parts.push(deliveryAddress.city);
      if (deliveryAddress.address) parts.push(deliveryAddress.address);
      
      // Filtrar valores vazios e retornar
      const filtered = parts.filter(part => part && part.toString().trim());
      return filtered.length > 0 ? filtered.join(', ') : 'Endereço não disponível';
    }
    
    return 'Endereço não disponível';
  };

  /**
   * Função otimizada para extrair informações dos itens
   */
  const getOrderItemsDisplay = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { preview: 'Itens não disponíveis', count: 0 };
    }

    const itemsPreview = items.slice(0, 2).map(item => {
      const quantity = item.quantity || 1;
      const name = item.menu_item?.name || item.name || 'Item';
      return `${quantity}x ${name}`;
    });

    const hasMore = items.length > 2;
    const moreCount = items.length - 2;

    return {
      preview: itemsPreview,
      hasMore,
      moreCount,
      totalItems: items.length
    };
  };

  /**
   * Função para obter método de pagamento formatado
   */
  const getPaymentMethodDisplay = (paymentMethod) => {
    const methodMap = {
      'cash': { icon: 'cash', text: 'Dinheiro', color: colors.success },
      'mpesa': { icon: 'phone-portrait', text: 'M-Pesa', color: colors.secondary[100] },
      'card': { icon: 'card', text: 'Cartão', color: colors.primary[100] },
      'bank_transfer': { icon: 'business', text: 'Transferência', color: colors.typography[80] }
    };
    
    return methodMap[paymentMethod] || { 
      icon: 'help-circle', 
      text: paymentMethod?.toUpperCase() || 'N/A', 
      color: colors.gray[100] 
    };
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
            ? `${availableOrders.length} ${availableOrders.length === 1 ? 'entrega disponível' : 'entregas disponíveis'}` 
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

  /**
   * RENDERIZAÇÃO OTIMIZADA DO CARD DE PEDIDO
   */
  const renderOrderCard = ({ item }) => {
    // Extrair dados formatados
    const deliveryAddress = getDeliveryAddress(item.delivery_address);
    const itemsInfo = getOrderItemsDisplay(item.items);
    const paymentInfo = getPaymentMethodDisplay(item.payment_method);
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('RealOrderDetails', { order: item })}
      >
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {/* Logo/Imagem do Restaurante */}
            <View style={styles.restaurantImageContainer}>
              {item.restaurant?.image ? (
                <Image 
                  source={{ uri: item.restaurant.image }} 
                  style={styles.restaurantImage}
                />
              ) : (
                <View style={styles.restaurantImagePlaceholder}>
                  <Ionicons name="restaurant" size={16} color={colors.gray[100]} />
                </View>
              )}
            </View>
            
            <View style={styles.orderBasicInfo}>
              <Text style={styles.restaurantName}>
                {item.restaurant?.name || 'Restaurante'}
              </Text>
              <Text style={styles.orderNumber}>
                #{item.order_number || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>
                {getOrderStatusText(item.status)}
              </Text>
            </View>
            
            {/* Distância */}
            {item.distance_km && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={12} color={colors.primary[100]} />
                <Text style={styles.distanceText}>
                  {formatDistance(item.distance_km)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Informações do Cliente */}
        <View style={styles.customerSection}>
          <Ionicons name="person-outline" size={14} color={colors.typography[50]} />
          <Text style={styles.customerName}>
            {item.customer?.name || 'Cliente não informado'}
          </Text>
          {item.customer?.phone && (
            <View style={styles.phoneIndicator}>
              <Ionicons name="call-outline" size={12} color={colors.success} />
            </View>
          )}
        </View>

        {/* Endereço de Entrega */}
        <View style={styles.addressSection}>
          <Ionicons name="location-outline" size={14} color={colors.primary[100]} />
          <Text style={styles.address} numberOfLines={2}>
            {deliveryAddress}
          </Text>
        </View>

        {/* Itens do Pedido */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Ionicons name="bag-outline" size={14} color={colors.secondary[100]} />
            <Text style={styles.itemsCount}>
              {itemsInfo.totalItems} {itemsInfo.totalItems === 1 ? 'item' : 'itens'}
            </Text>
          </View>
          
          <View style={styles.itemsList}>
            {itemsInfo.preview.map((itemText, index) => (
              <Text key={index} style={styles.itemText}>
                • {itemText}
              </Text>
            ))}
            {itemsInfo.hasMore && (
              <Text style={styles.moreItemsText}>
                +{itemsInfo.moreCount} {itemsInfo.moreCount === 1 ? 'outro item' : 'outros itens'}
              </Text>
            )}
          </View>
        </View>

        {/* Footer do Card */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            {/* Método de Pagamento */}
            <View style={styles.paymentInfo}>
              <Ionicons name={paymentInfo.icon} size={14} color={paymentInfo.color} />
              <Text style={[styles.paymentText, { color: paymentInfo.color }]}>
                {paymentInfo.text}
              </Text>
            </View>
            
            {/* Tempo Estimado */}
            {item.estimated_pickup_time && (
              <View style={styles.timeInfo}>
                <Ionicons name="time-outline" size={14} color={colors.typography[50]} />
                <Text style={styles.timeText}>
                  ~{item.estimated_pickup_time}
                </Text>
              </View>
            )}
          </View>
          
          {/* Valor Total */}
          <View style={styles.totalSection}>
            <Text style={styles.totalAmount}>
              {formatCurrency(item.total_amount)}
            </Text>
            {item.delivery_fee && parseFloat(item.delivery_fee) > 0 && (
              <Text style={styles.deliveryFee}>
                Taxa: {formatCurrency(item.delivery_fee)}
              </Text>
            )}
          </View>
        </View>

        {/* Indicador Visual de Ação */}
        <View style={styles.actionIndicator}>
          <Ionicons name="chevron-forward" size={16} color={colors.primary[100]} />
        </View>
      </TouchableOpacity>
    );
  };

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
              <View style={[
                styles.activeStatusBadge,
                { backgroundColor: getStatusColor(activeDelivery.status) }
              ]}>
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
              ? `${availableOrders.length} ${availableOrders.length === 1 ? 'entrega disponível' : 'entregas disponíveis'}`
              : 'Fique online para receber pedidos'
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={loading}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={loading ? colors.gray[100] : (isOnline ? colors.primary[100] : colors.gray[100])}
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
          keyExtractor={(item) => `order-${item.id}`}
          contentContainerStyle={[
            styles.listContainer,
            availableOrders.length === 0 && styles.emptyListContainer
          ]}
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
                  : `Não há pedidos no raio de ${deliveryRadius}km. Tente aumentar o raio de busca.`
                }
              </Text>
              {!loading && (
                <TouchableOpacity 
                  style={styles.settingsLinkButton}
                  onPress={() => setShowSettings(true)}
                >
                  <Text style={styles.settingsLinkText}>Ajustar Configurações</Text>
                </TouchableOpacity>
              )}
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
  emptyListContainer: {
    flexGrow: 1,
  },
  // ESTILOS OTIMIZADOS PARA O CARD DE PEDIDO
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  restaurantImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[20],
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBasicInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 12,
    color: colors.typography[50],
    fontFamily: 'monospace',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 11,
    color: colors.primary[100],
    fontWeight: '600',
    marginLeft: 2,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  customerName: {
    fontSize: 14,
    color: colors.typography[80],
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  phoneIndicator: {
    marginLeft: 8,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: colors.typography[50],
    marginLeft: 6,
    lineHeight: 18,
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemsCount: {
    fontSize: 12,
    color: colors.secondary[100],
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsList: {
    paddingLeft: 18,
  },
  itemText: {
    fontSize: 12,
    color: colors.typography[80],
    marginBottom: 1,
    lineHeight: 16,
  },
  moreItemsText: {
    fontSize: 11,
    color: colors.typography[20],
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  footerLeft: {
    flex: 1,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: colors.typography[50],
    marginLeft: 3,
    fontWeight: '500',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  deliveryFee: {
    fontSize: 10,
    color: colors.typography[50],
    marginTop: 2,
  },
  actionIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
  },
  emptyContainer: {
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
  emptySubtitle: {
    fontSize: 14,
    color: colors.typography[50],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  locationButton: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsLinkButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  settingsLinkText: {
    color: colors.primary[100],
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // ESTILOS PARA ENTREGA ATIVA
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
  // ESTILOS DO MODAL DE CONFIGURAÇÕES
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