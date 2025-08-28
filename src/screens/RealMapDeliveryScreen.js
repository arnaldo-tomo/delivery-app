import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDelivery } from '../context/DeliveryContext';
import LocationService from '../services/LocationService';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  secondary: '#4ECDC4',
  success: '#45B7D1',
  warning: '#FFA726',
  danger: '#EF5350',
  dark: '#2C3E50',
  light: '#ECF0F1',
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.3)',
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyAtu-ig_-9TgJwxRqhTMrnDLF1HgeTxm1c';

export default function RealMapDeliveryScreen({ route, navigation }) {
  const { order } = route.params;
  const { updateDeliveryStatus } = useDelivery();
  const mapRef = useRef(null);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '', steps: [] });
  const [isTracking, setIsTracking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [showDetails, setShowDetails] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Animação para marcador do entregador
  const markerCoordinate = useRef(new AnimatedRegion({
    latitude: -25.9692,
    longitude: 32.5732,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  })).current;
  
  // Animações
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeMap();
    startAnimations();
    return () => {
      LocationService.stopLocationTracking();
    };
  }, []);

  const startAnimations = () => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de pulso para localização
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const formatDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return 'Endereço não disponível';
    if (typeof deliveryAddress === 'string') return deliveryAddress;
    if (typeof deliveryAddress === 'object') {
      const parts = [];
      if (deliveryAddress.street) parts.push(deliveryAddress.street);
      if (deliveryAddress.neighborhood) parts.push(deliveryAddress.neighborhood);
      if (deliveryAddress.city) parts.push(deliveryAddress.city);
      return parts.join(', ') || 'Endereço não disponível';
    }
    return 'Endereço não disponível';
  };

  const initializeMap = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);

      const restaurantAddr = order.restaurant?.address || 'Maputo, Moçambique';
      const customerAddr = formatDeliveryAddress(order.delivery_address);

      const [restaurantPos, customerPos] = await Promise.all([
        LocationService.geocodeAddress(restaurantAddr, GOOGLE_MAPS_API_KEY),
        LocationService.geocodeAddress(customerAddr, GOOGLE_MAPS_API_KEY)
      ]);

      setRestaurantLocation(restaurantPos);
      setCustomerLocation(customerPos);

      await calculateRoute(location, restaurantPos, customerPos);
      startLocationTracking();

    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      Alert.alert('Erro', 'Não foi possível carregar o mapa: ' + error.message);
    }
  };

  const calculateRoute = async (current, restaurant, customer) => {
    try {
      const destination = currentStatus === 'picked_up' ? customer : restaurant;
      
      console.log('🚗 Calculando rota para:', destination);
      const directions = await LocationService.getDirections(
        current, 
        destination, 
        GOOGLE_MAPS_API_KEY
      );

      console.log('✅ Rota recebida:', directions);
      
      // Usar coordenadas reais da rota se disponível
      if (directions.coordinates && directions.coordinates.length > 0) {
        setRouteCoordinates(directions.coordinates);
        console.log('🛣️ Rota real carregada:', directions.coordinates.length, 'pontos');
      } else {
        // Fallback para linha reta
        setRouteCoordinates([current, destination]);
        console.log('📏 Usando linha reta como fallback');
      }
      
      setRouteInfo(directions);
      setRemainingDistance(directions.distance);

      // Ajustar zoom do mapa para mostrar toda a rota
      if (mapRef.current && mapReady) {
        const allPoints = [current, restaurant, customer];
        
        // Se temos coordenadas da rota, incluir também os pontos extremos
        if (directions.coordinates && directions.coordinates.length > 2) {
          allPoints.push(
            directions.coordinates[0],
            directions.coordinates[directions.coordinates.length - 1]
          );
        }
        
        setTimeout(() => {
          mapRef.current.fitToCoordinates(allPoints, {
            edgePadding: { top: 150, right: 80, bottom: 350, left: 80 },
            animated: true,
          });
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Erro ao calcular rota:', error);
      // Em caso de erro, mostrar linha reta
      const destination = currentStatus === 'picked_up' ? customer : restaurant;
      setRouteCoordinates([current, destination]);
    }
  };

  const startLocationTracking = () => {
    setIsTracking(true);
    setIsNavigating(true);
    
    LocationService.startLocationTracking((location) => {
      console.log('📍 Nova localização:', location);
      setCurrentLocation(location);
      
      // Animar marcador para nova posição (estilo Yango)
      if (Platform.OS === 'android') {
        markerCoordinate.timing({
          ...location,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } else {
        // iOS usa animação mais suave
        markerCoordinate.timing({
          ...location,
          duration: 500,
          useNativeDriver: false,
        }).start();
      }
      
      // Calcular progresso na rota se temos coordenadas
      if (routeCoordinates.length > 2) {
        const progress = LocationService.calculateRouteProgress(location, routeCoordinates);
        setRouteProgress(progress.progress);
        setRemainingDistance(`${progress.remainingDistance.toFixed(1)} km restantes`);
        
        console.log('🎯 Progresso na rota:', Math.round(progress.progress * 100) + '%');
      }
      
      // Centralizar mapa na nova posição se estiver navegando
      if (isNavigating && mapRef.current) {
        mapRef.current.animateToRegion({
          ...location,
          latitudeDelta: LATITUDE_DELTA * 0.5, // Zoom mais próximo durante navegação
          longitudeDelta: LONGITUDE_DELTA * 0.5,
        }, 500);
      }
      
      // Atualizar status na API
      if (order.id) {
        updateDeliveryStatus(order.id, currentStatus, location);
      }
    });
    
    // Configurar callback para atualização de rota
    LocationService.setRouteUpdateCallback((location) => {
      // Recalcular rota a cada 2 minutos ou se muito longe da rota
      const progress = LocationService.calculateRouteProgress(location, routeCoordinates);
      if (progress.distanceFromRoute > 0.1) { // 100m da rota
        console.log('🔄 Muito longe da rota, recalculando...');
        if (restaurantLocation && customerLocation) {
          calculateRoute(location, restaurantLocation, customerLocation);
        }
      }
    });
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const result = await updateDeliveryStatus(order.id, newStatus, currentLocation);
      
      if (result.success) {
        setCurrentStatus(newStatus);
        
        if (newStatus === 'delivered') {
    Alert.alert(
        '🎉 Entrega Concluída!',
        'Parabéns! A entrega foi realizada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'RealHome' }) }]
      );
        } else {
          if (restaurantLocation && customerLocation) {
            await calculateRoute(currentLocation, restaurantLocation, customerLocation);
          }
        }
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    }
  };

  const openExternalNavigation = () => {
    const destination = currentStatus === 'picked_up' ? customerLocation : restaurantLocation;
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
      Linking.openURL(url);
    }
  };

  const callCustomer = () => {
    const phone = order.customer?.phone || order.delivery_address?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const centerOnLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      
      // Animar marcador
      markerCoordinate.timing({
        ...location,
        duration: 1000,
        useNativeDriver: false,
      }).start();
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...location,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter sua localização');
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
    Animated.timing(slideAnim, {
      toValue: showDetails ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getNextAction = () => {
    switch (currentStatus) {
      case 'ready':
      case 'confirmed':
        return { 
          text: 'Marcar como Coletado', 
          status: 'picked_up',
          icon: 'checkmark-circle',
          color: colors.warning
        };
      case 'picked_up':
        return { 
          text: 'Marcar como Entregue', 
          status: 'delivered',
          icon: 'trophy',
          color: colors.success
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const getCurrentDestination = () => {
    return currentStatus === 'picked_up' ? 'Cliente' : 'Restaurante';
  };

  const mapStyle = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header moderno com blur */}
      <BlurView intensity={95} tint="dark" style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Entrega #{order.order_number}</Text>
            <Text style={styles.headerSubtitle}>Para: {getCurrentDestination()}</Text>
          </View>
          
          <TouchableOpacity onPress={centerOnLocation} style={styles.headerButton}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="locate" size={24} color={colors.white} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Mapa com marcadores customizados */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        followsUserLocation={isTracking}
        onMapReady={() => setMapReady(true)}
      >
        {/* Marcador animado da localização atual */}
        <Marker.Animated
          coordinate={markerCoordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
          style={{
            transform: [{
              rotate: '0deg' // Aqui você pode calcular rotação baseada na direção
            }]
          }}
        >
          <Animated.View style={[styles.currentLocationMarker, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.markerGradient}
            >
              <Ionicons name="navigate" size={18} color={colors.white} />
            </LinearGradient>
            <View style={styles.markerPulse} />
          </Animated.View>
        </Marker.Animated>

        {/* Marcador do restaurante */}
        {restaurantLocation && (
          <Marker 
            coordinate={restaurantLocation}
            title={order.restaurant?.name || 'Restaurante'}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.restaurantMarker}>
              <LinearGradient
                colors={[colors.warning, '#FF8F00']}
                style={styles.markerGradient}
              >
                <MaterialIcons name="restaurant" size={20} color={colors.white} />
              </LinearGradient>
              <View style={styles.markerShadow} />
            </View>
          </Marker>
        )}

        {/* Marcador do cliente */}
        {customerLocation && (
          <Marker 
            coordinate={customerLocation}
            title={order.customer?.name || 'Cliente'}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.customerMarker}>
              <LinearGradient
                colors={[colors.success, '#388E3C']}
                style={styles.markerGradient}
              >
                <Ionicons name="home" size={20} color={colors.white} />
              </LinearGradient>
              <View style={styles.markerShadow} />
            </View>
          </Marker>
        )}

        {/* Rota real do Google Maps */}
        {routeCoordinates.length > 0 && (
          <>
            {/* Rota principal */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            {/* Rota de fundo para efeito de sombra */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.dark + '40'}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={0}
            />
            {/* Linha de progresso */}
            {routeProgress > 0 && (
              <Polyline
                coordinates={routeCoordinates.slice(0, Math.ceil(routeCoordinates.length * routeProgress))}
                strokeColor={colors.success}
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
                zIndex={2}
              />
            )}
          </>
        )}
      </MapView>

      {/* Status indicator flutuante */}
      <Animated.View 
        style={[
          styles.statusIndicator,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 0],
          })}] }
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.statusContent}>
          <View style={styles.statusIcon}>
            <Ionicons name="navigate-circle" size={24} color={colors.primary} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusDistance}>{routeInfo.distance}</Text>
            <Text style={styles.statusTime}>{routeInfo.duration}</Text>
            {routeProgress > 0 && (
              <Text style={styles.statusProgress}>
                {Math.round(routeProgress * 100)}% concluído
              </Text>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {/* Botões de ação flutuantes */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity onPress={callCustomer} style={styles.actionButton}>
          <LinearGradient colors={[colors.secondary, '#26A69A']} style={styles.buttonGradient}>
            <Ionicons name="call" size={20} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={openExternalNavigation} style={styles.actionButton}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
            <Ionicons name="navigate" size={20} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Painel de informações deslizante */}
      <Animated.View 
        style={[
          styles.deliveryPanel,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [showDetails ? 0 : 200, showDetails ? 0 : 200],
              })
            }]
          }
        ]}
      >
        <BlurView intensity={100} tint="light" style={styles.panelContent}>
          {/* Handle do painel */}
          <TouchableOpacity onPress={toggleDetails} style={styles.panelHandle}>
            <View style={styles.handleBar} />
          </TouchableOpacity>
          
          {/* Informações do pedido */}
          <View style={styles.orderInfo}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.customerName}>
                  {order.customer?.name || 'Cliente'}
                </Text>
                <Text style={styles.orderAmount}>
                  MT {parseFloat(order.total_amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentBadge}>
                <Ionicons 
                  name={order.payment_method === 'cash' ? 'cash' : 'card'} 
                  size={16} 
                  color={colors.primary} 
                />
                <Text style={styles.paymentText}>
                  {order.payment_method === 'cash' ? 'Dinheiro' : 
                   order.payment_method === 'mpesa' ? 'M-Pesa' : 'E-Mola'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.address}>
              {formatDeliveryAddress(order.delivery_address)}
            </Text>
          </View>

          {/* Estatísticas da rota */}
          <View style={styles.routeStats}>
            <View style={styles.statItem}>
              <Ionicons name="speedometer" size={18} color={colors.primary} />
              <Text style={styles.statLabel}>Distância</Text>
              <Text style={styles.statValue}>{routeInfo.distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={18} color={colors.secondary} />
              <Text style={styles.statLabel}>Tempo</Text>
              <Text style={styles.statValue}>{routeInfo.duration}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="location" size={18} color={colors.success} />
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValue}>
                {currentStatus === 'picked_up' ? 'A caminho' : 'Coletando'}
              </Text>
            </View>
          </View>

          {/* Botão de ação principal */}
          {nextAction && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(nextAction.status)}
              style={styles.mainActionButton}
            >
              <LinearGradient
                colors={[nextAction.color, nextAction.color + 'DD']}
                style={styles.mainActionGradient}
              >
                <Ionicons name={nextAction.icon} size={24} color={colors.white} />
                <Text style={styles.mainActionText}>{nextAction.text}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </BlurView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '30',
    borderWidth: 2,
    borderColor: colors.primary + '50',
  },
  restaurantMarker: {
    alignItems: 'center',
  },
  customerMarker: {
    alignItems: 'center',
  },
  markerShadow: {
    width: 20,
    height: 8,
    backgroundColor: colors.shadow,
    borderRadius: 10,
    marginTop: 5,
  },
  statusIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : (StatusBar.currentHeight || 0) + 80,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  statusIcon: {
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statusTime: {
    fontSize: 14,
    color: colors.dark + 'AA',
  },
  floatingButtons: {
    position: 'absolute',
    right: 20,
    bottom: 350,
    zIndex: 999,
  },
  actionButton: {
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 998,
  },
  panelContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  panelHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.light,
    borderRadius: 2,
  },
  orderInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  address: {
    fontSize: 14,
    color: colors.dark + 'CC',
    lineHeight: 20,
  },
  routeStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.dark + 'AA',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  mainActionButton: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  mainActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 8,
  },
});