// src/screens/MapDeliveryScreen.js
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
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

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

export default function MapDeliveryScreen({ route, navigation }) {
  const { delivery } = route.params;
  const mapRef = useRef(null);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [distance, setDistance] = useState('');

  // Coordenadas de exemplo para Maputo, Moçambique
  const maputoCenter = {
    latitude: -25.9655,
    longitude: 32.5832,
  };

  // Simulação de endereços reais em Maputo
  const getLocationFromAddress = async (address) => {
    // Simulação de geocoding - em produção, use uma API real como Google Geocoding
    const locations = {
      "Av. Julius Nyerere, 1234, Maputo": { latitude: -25.9655, longitude: 32.5832 },
      "Rua da Mesquita, 567, Polana": { latitude: -25.9425, longitude: 32.5886 },
      "Av. Vladimir Lenine, 890, Maputo": { latitude: -25.9692, longitude: 32.5731 },
      "Costa do Sol, Maputo": { latitude: -25.9342, longitude: 32.6123 },
      "Sommerschield, Maputo": { latitude: -25.9512, longitude: 32.5965 }
    };
    
    return locations[address] || maputoCenter;
  };

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      // Solicitar permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização para navegar');
        return;
      }

      // Obter localização atual
      const location = await Location.getCurrentPositionAsync({});
      const currentPos = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(currentPos);

      // Obter coordenadas do restaurante e cliente
      const restaurantPos = await getLocationFromAddress(delivery.restaurantAddress || "Av. Julius Nyerere, 1234, Maputo");
      const customerPos = await getLocationFromAddress(delivery.address);
      
      setRestaurantLocation(restaurantPos);
      setCustomerLocation(customerPos);

      // Calcular rota
      calculateRoute(currentPos, restaurantPos, customerPos);

    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização');
    }
  };

  const calculateRoute = async (current, restaurant, customer) => {
    try {
      // Simulação de cálculo de rota - em produção, use Google Directions API
      const route = [current, restaurant, customer];
      setRouteCoordinates(route);
      
      // Calcular distância e tempo estimado (simulado)
      const dist = calculateDistance(current, customer);
      setDistance(`${dist.toFixed(1)} km`);
      setEstimatedTime(`${Math.round(dist * 3)} min`); // 3 min por km (simulação)

      // Ajustar zoom do mapa para mostrar toda a rota
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(route, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startNavigation = () => {
    const destination = customerLocation;
    if (destination) {
      // Abrir app de navegação externo (Google Maps, Waze, etc.)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
      Linking.openURL(url);
      setIsNavigating(true);
    }
  };

  const centerOnCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const newPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(newPosition);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newPosition,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter sua localização atual');
    }
  };

  const callCustomer = () => {
    Linking.openURL(`tel:${delivery.customerPhone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navegação</Text>
        <TouchableOpacity 
          onPress={centerOnCurrentLocation}
          style={styles.locationButton}
        >
          <Ionicons name="locate" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...maputoCenter,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isNavigating}
      >
        {/* Marcador da posição atual */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Sua Localização"
            description="Você está aqui"
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
            title={delivery.restaurant}
            description="Restaurante - Ponto de coleta"
            pinColor={colors.secondary[100]}
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
            title={delivery.customerName}
            description={delivery.address}
            pinColor={colors.primary[100]}
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
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Informações da entrega */}
      <View style={styles.deliveryInfo}>
        <View style={styles.infoHeader}>
          <Text style={styles.customerName}>{delivery.customerName}</Text>
          <Text style={styles.totalAmount}>{delivery.total}</Text>
        </View>
        
        <Text style={styles.address}>{delivery.address}</Text>
        
        <View style={styles.routeStats}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={16} color={colors.primary[100]} />
            <Text style={styles.statText}>{distance}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={colors.primary[100]} />
            <Text style={styles.statText}>{estimatedTime}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="card" size={16} color={colors.secondary[100]} />
            <Text style={styles.statText}>{delivery.payment}</Text>
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
            onPress={startNavigation}
          >
            <Ionicons name="navigate" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Navegar</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 18,
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
});