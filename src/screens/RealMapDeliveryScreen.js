// src/screens/RealMapDeliveryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';
import LocationService from '../services/LocationService';

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// SUBSTITUA PELA SUA CHAVE REAL DO GOOGLE MAPS
const GOOGLE_MAPS_API_KEY = 'AIzaSyAtu-ig_-9TgJwxRqhTMrnDLF1HgeTxm1c';

export default function RealMapDeliveryScreen({ route, navigation }) {
  const { order } = route.params;
  const { updateDeliveryStatus } = useDelivery();
  const mapRef = useRef(null);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '' });
  const [isTracking, setIsTracking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);

  useEffect(() => {
    initializeMap();
    return () => {
      LocationService.stopLocationTracking();
    };
  }, []);

  const initializeMap = async () => {
    try {
      // Obter localização atual
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);

      // Geocodificar endereços reais
      const restaurantAddr = order.restaurant?.address || 'Maputo, Moçambique';
      const customerAddr = order.delivery_address?.address || order.delivery_address?.street || 'Maputo, Moçambique';

      const [restaurantPos, customerPos] = await Promise.all([
        LocationService.geocodeAddress(restaurantAddr, GOOGLE_MAPS_API_KEY),
        LocationService.geocodeAddress(customerAddr, GOOGLE_MAPS_API_KEY)
      ]);

      setRestaurantLocation(restaurantPos);
      setCustomerLocation(customerPos);

      // Calcular rota real
      await calculateRoute(location, restaurantPos, customerPos);

      // Iniciar tracking de localização
      startLocationTracking();

    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      Alert.alert('Erro', 'Não foi possível carregar o mapa: ' + error.message);
    }
  };

  const calculateRoute = async (current, restaurant, customer) => {
    try {
      // Determinar destino baseado no status
      const destination = currentStatus === 'picked_up' ? customer : restaurant;
      
      const directions = await LocationService.getDirections(
        current, 
        destination, 
        GOOGLE_MAPS_API_KEY
      );

      setRouteInfo({
        distance: directions.distance,
        duration: directions.duration
      });

      // Decodificar polyline (você precisará de uma biblioteca para isso)
      // Por agora, usar linha reta
      setRouteCoordinates([current, destination]);

      // Ajustar zoom do mapa
      if (mapRef.current) {
        mapRef.current.fitToCoordinates([current, restaurant, customer], {
          edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
    }
  };

  const startLocationTracking = () => {
    setIsTracking(true);
    LocationService.startLocationTracking((location) => {
      setCurrentLocation(location);
      
      // Atualizar localização na API
      if (order.id) {
        updateDeliveryStatus(order.id, currentStatus, location);
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
            'Entrega Concluída!',
            'Parabéns! A entrega foi realizada com sucesso.',
            [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
          );
        } else {
          // Recalcular rota para novo destino
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

  const getNextAction = () => {
    switch (currentStatus) {
      case 'ready':
      case 'confirmed':
        return { text: 'Marcar como Coletado', status: 'picked_up' };
      case 'picked_up':
        return { text: 'Marcar como Entregue', status: 'delivered' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Pedido #{order.order_number}
        </Text>
        <TouchableOpacity 
          onPress={() => LocationService.getCurrentLocation().then(setCurrentLocation)}
          style={styles.locationButton}
        >
          <Ionicons name="locate" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isTracking}
      >
        {/* Marcador da posição atual */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Sua Localização"
            description="Entregador"
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="bicycle" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Marcador do restaurante */}
        {restaurantLocation && (
          <Marker
            coordinate={restaurantLocation}
            title={order.restaurant?.name || 'Restaurante'}
            description="Ponto de coleta"
          >
            <View style={styles.restaurantMarker}>
              <Ionicons name="restaurant" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Marcador do cliente */}
        {customerLocation && (
          <Marker
            coordinate={customerLocation}
            title={order.customer?.name || 'Cliente'}
            description="Destino da entrega"
          >
            <View style={styles.customerMarker}>
              <Ionicons name="home" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* Linha da rota */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary[100]}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Informações da entrega */}
      <View style={styles.deliveryInfo}>
        <View style={styles.infoHeader}>
          <Text style={styles.customerName}>
            {order.customer?.name || 'Cliente'}
          </Text>
          <Text style={styles.totalAmount}>
            MT {parseFloat(order.total_amount).toFixed(2)}
          </Text>
        </View>
        
        <Text style={styles.address}>
          {order.delivery_address?.address || order.delivery_address?.street || 'Endereço não disponível'}
        </Text>
        
        <View style={styles.routeStats}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={16} color={colors.primary[100]} />
            <Text style={styles.statText}>{routeInfo.distance}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={colors.primary[100]} />
            <Text style={styles.statText}>{routeInfo.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="card" size={16} color={colors.secondary[100]} />
            <Text style={styles.statText}>{order.payment_method}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={callCustomer}
          >
            <Ionicons name="call" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Ligar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navigateButton}
            onPress={openExternalNavigation}
          >
            <Ionicons name="navigate" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Navegar</Text>
          </TouchableOpacity>
        </View>

        {nextAction && (
          <TouchableOpacity 
            style={styles.statusButton}
            onPress={() => handleStatusUpdate(nextAction.status)}
          >
            <Text style={styles.statusButtonText}>{nextAction.text}</Text>
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.primary[100],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  locationButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  restaurantMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  customerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  deliveryInfo: {
    backgroundColor: colors.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  address: {
    fontSize: 14,
    color: colors.typography[50],
    marginBottom: 16,
    lineHeight: 20,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: colors.gray[20],
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.typography[80],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary[100],
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  navigateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[100],
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statusButton: {
    backgroundColor: colors.primary[100],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});