// src/services/LocationService.js - VERSÃO COMPLETA COM ROTA REAL
import * as Location from 'expo-location';

// Função para decodificar polyline do Google Maps
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  
  let points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    let dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    let dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.routeUpdateCallback = null;
  }

  async requestPermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão de localização negada');
    }
    return true;
  }

  async getCurrentLocation() {
    await this.requestPermissions();
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    this.currentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    console.log('📍 Localização atual obtida:', this.currentLocation);
    return this.currentLocation;
  }

  async startLocationTracking(callback) {
    await this.requestPermissions();
    
    this.watchId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // 3 seconds - mais frequente para animação suave
        distanceInterval: 5, // 5 meters - menor distância para maior precisão
      },
      (location) => {
        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log('📍 Localização atualizada:', this.currentLocation);
        callback(this.currentLocation);
        
        // Se há callback para atualizar rota, chama ele
        if (this.routeUpdateCallback) {
          this.routeUpdateCallback(this.currentLocation);
        }
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  // 🗺️ GEOCODING REAL COM GOOGLE MAPS API
  async geocodeAddress(address, apiKey) {
    try {
      console.log(`🔍 Geocodificando: "${address}"`);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=mz&language=pt`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🗺️ Status da geocodificação:', data.status);
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const coordinates = {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formatted_address: result.formatted_address,
        };
        
        console.log('✅ Coordenadas encontradas:', coordinates);
        return coordinates;
      }
      
      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Limite de consultas excedido - tente novamente em alguns minutos');
      }
      
      throw new Error(`Geocodificação falhou: ${data.status} - ${data.error_message || 'Endereço não encontrado'}`);
    } catch (error) {
      console.error('❌ Erro na geocodificação:', error);
      
      // 🔧 FALLBACK: Coordenadas de Maputo se falhar
      console.log('🔄 Usando coordenadas padrão de Maputo');
      return {
        latitude: -25.9692,
        longitude: 32.5732,
        formatted_address: 'Maputo, Moçambique',
      };
    }
  }

  // 🛣️ DIRECTIONS API COM ROTA REAL
  async getDirections(origin, destination, apiKey, waypoints = []) {
    try {
      console.log('🛣️ Calculando rota de:', origin, 'para:', destination);
      
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&region=mz&language=pt&mode=driving&avoid=tolls`;
      
      // Adicionar waypoints se houver
      if (waypoints.length > 0) {
        const waypointsStr = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
        url += `&waypoints=${waypointsStr}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🗺️ Status das direções:', data.status);
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Decodificar polyline para obter coordenadas da rota
        const routeCoordinates = decodePolyline(route.overview_polyline.points);
        
        const directions = {
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value, // metros
          durationValue: leg.duration.value, // segundos
          polyline: route.overview_polyline.points,
          coordinates: routeCoordinates, // 🔥 COORDENADAS REAIS DA ROTA
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML
            distance: step.distance.text,
            duration: step.duration.text,
            startLocation: step.start_location,
            endLocation: step.end_location,
          })),
          bounds: route.bounds,
        };
        
        console.log('✅ Rota calculada:', {
          distance: directions.distance,
          duration: directions.duration,
          coordenadas: routeCoordinates.length
        });
        
        return directions;
      }
      
      if (data.status === 'ZERO_RESULTS') {
        throw new Error('Nenhuma rota encontrada entre os pontos');
      }
      
      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Limite de consultas excedido');
      }
      
      throw new Error(`Cálculo de rota falhou: ${data.status} - ${data.error_message || 'Erro desconhecido'}`);
    } catch (error) {
      console.error('❌ Erro no cálculo de rota:', error);
      
      // 🔧 FALLBACK: Linha reta se API falhar
      const distance = this.calculateDistance(origin, destination);
      const estimatedTime = Math.round(distance * 2.5); // ~2.5 min por km
      
      console.log(`🔄 Usando linha reta: ${distance.toFixed(1)}km`);
      
      return {
        distance: `${distance.toFixed(1)} km`,
        duration: `${estimatedTime} min`,
        distanceValue: distance * 1000,
        durationValue: estimatedTime * 60,
        coordinates: [origin, destination], // Linha reta
        steps: [{
          instruction: `Siga em direção ao destino por ${distance.toFixed(1)} km`,
          distance: `${distance.toFixed(1)} km`,
          duration: `${estimatedTime} min`,
        }],
        polyline: null,
        bounds: null,
        fallback: true,
      };
    }
  }

  // 📏 CALCULAR DISTÂNCIA ENTRE DOIS PONTOS (HAVERSINE)
  calculateDistance(point1, point2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 📍 ENCONTRAR PONTO MAIS PRÓXIMO NA ROTA
  findNearestPointOnRoute(currentLocation, routeCoordinates) {
    if (!routeCoordinates || routeCoordinates.length === 0) return null;
    
    let nearestPoint = routeCoordinates[0];
    let minDistance = this.calculateDistance(currentLocation, nearestPoint);
    let nearestIndex = 0;
    
    for (let i = 1; i < routeCoordinates.length; i++) {
      const distance = this.calculateDistance(currentLocation, routeCoordinates[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = routeCoordinates[i];
        nearestIndex = i;
      }
    }
    
    return {
      point: nearestPoint,
      index: nearestIndex,
      distance: minDistance,
      progress: nearestIndex / (routeCoordinates.length - 1), // 0 a 1
    };
  }

  // 🎯 CALCULAR PROGRESSO NA ROTA
  calculateRouteProgress(currentLocation, routeCoordinates) {
    const nearest = this.findNearestPointOnRoute(currentLocation, routeCoordinates);
    if (!nearest) return { progress: 0, remainingDistance: 0 };
    
    // Calcular distância restante
    let remainingDistance = 0;
    for (let i = nearest.index; i < routeCoordinates.length - 1; i++) {
      remainingDistance += this.calculateDistance(routeCoordinates[i], routeCoordinates[i + 1]);
    }
    
    return {
      progress: nearest.progress,
      remainingDistance: remainingDistance,
      nearestPoint: nearest.point,
      distanceFromRoute: nearest.distance,
    };
  }

  // 🔄 ATUALIZAR ROTA DINAMICAMENTE
  setRouteUpdateCallback(callback) {
    this.routeUpdateCallback = callback;
  }

  // 🎨 FORMATAR ENDEREÇO
  formatDeliveryAddress(deliveryAddress) {
    if (!deliveryAddress) return 'Maputo, Moçambique';
    
    if (typeof deliveryAddress === 'string') {
      return deliveryAddress;
    }
    
    if (typeof deliveryAddress === 'object') {
      const parts = [];
      if (deliveryAddress.street) parts.push(deliveryAddress.street);
      if (deliveryAddress.neighborhood) parts.push(deliveryAddress.neighborhood);
      if (deliveryAddress.city) parts.push(deliveryAddress.city);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return 'Maputo, Moçambique';
  }

  // 🧭 REVERSE GEOCODING
  async reverseGeocode(latitude, longitude) {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const address = result[0];
        return {
          street: address.street || address.name || '',
          city: address.city || address.subregion || 'Maputo',
          country: address.country || 'Moçambique',
          formatted_address: `${address.street || ''} ${address.city || 'Maputo'}`.trim(),
        };
      }
      throw new Error('Localização não encontrada');
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      return {
        street: '',
        city: 'Maputo',
        country: 'Moçambique',
        formatted_address: 'Maputo, Moçambique',
      };
    }
  }
}

export default new LocationService();