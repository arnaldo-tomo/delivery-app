// src/services/GoogleMapsService.js - Serviço completo para Google Maps API
class GoogleMapsService {
  constructor() {
    // SUBSTITUA PELA SUA CHAVE REAL DO GOOGLE MAPS API
    this.API_KEY = 'AIzaSyAtu-ig_-9TgJwxRqhTMrnDLF1HgeTxm1c';
    this.BASE_URL = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Geocodificar endereço para coordenadas
   */
  async geocodeAddress(address) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.BASE_URL}/geocode/json?address=${encodedAddress}&key=${this.API_KEY}`;
      
      console.log('🗺️ Geocodificando endereço:', address);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        console.log('✅ Geocodificação bem-sucedida:', location);
        
        return {
          success: true,
          data: {
            latitude: location.lat,
            longitude: location.lng,
            formatted_address: result.formatted_address,
            place_id: result.place_id,
            types: result.types,
            address_components: result.address_components,
          }
        };
      } else {
        console.error('❌ Erro na geocodificação:', data.status, data.error_message);
        throw new Error(data.error_message || 'Endereço não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro na geocodificação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Geocodificação reversa (coordenadas para endereço)
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `${this.BASE_URL}/geocode/json?latlng=${latitude},${longitude}&key=${this.API_KEY}`;
      
      console.log('🔄 Geocodificação reversa:', latitude, longitude);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        
        console.log('✅ Geocodificação reversa bem-sucedida');
        
        return {
          success: true,
          data: {
            formatted_address: result.formatted_address,
            address_components: result.address_components,
            place_id: result.place_id,
            types: result.types,
          }
        };
      } else {
        throw new Error(data.error_message || 'Coordenadas não encontradas');
      }
    } catch (error) {
      console.error('❌ Erro na geocodificação reversa:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calcular rota entre dois pontos usando Directions API
   */
  async getDirections(origin, destination, options = {}) {
    try {
      const originStr = typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
      const destinationStr = typeof destination === 'string' ? destination : `${destination.latitude},${destination.longitude}`;
      
      // Parâmetros da requisição
      const params = new URLSearchParams({
        origin: originStr,
        destination: destinationStr,
        key: this.API_KEY,
        mode: options.mode || 'driving', // driving, walking, bicycling, transit
        avoid: options.avoid || '', // tolls, highways, ferries
        units: 'metric',
        language: 'pt-BR',
      });

      // Waypoints (pontos intermediários)
      if (options.waypoints && options.waypoints.length > 0) {
        const waypointsStr = options.waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
        params.append('waypoints', waypointsStr);
      }

      const url = `${this.BASE_URL}/directions/json?${params.toString()}`;
      
      console.log('🚗 Calculando rota:', originStr, '→', destinationStr);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        console.log('✅ Rota calculada:', leg.distance.text, leg.duration.text);
        
        return {
          success: true,
          data: {
            distance: {
              text: leg.distance.text,
              value: leg.distance.value, // em metros
            },
            duration: {
              text: leg.duration.text,
              value: leg.duration.value, // em segundos
            },
            polyline: route.overview_polyline.points,
            bounds: route.bounds,
            steps: leg.steps.map(step => ({
              distance: step.distance,
              duration: step.duration,
              instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
              maneuver: step.maneuver,
              start_location: step.start_location,
              end_location: step.end_location,
            })),
            start_address: leg.start_address,
            end_address: leg.end_address,
            warnings: route.warnings,
            waypoint_order: route.waypoint_order,
          }
        };
      } else {
        console.error('❌ Erro no cálculo de rota:', data.status, data.error_message);
        throw new Error(data.error_message || 'Rota não encontrada');
      }
    } catch (error) {
      console.error('❌ Erro no cálculo de rota:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calcular matriz de distâncias entre múltiplos pontos
   */
  async getDistanceMatrix(origins, destinations, options = {}) {
    try {
      const originsStr = origins.map(o => 
        typeof o === 'string' ? o : `${o.latitude},${o.longitude}`
      ).join('|');
      
      const destinationsStr = destinations.map(d => 
        typeof d === 'string' ? d : `${d.latitude},${d.longitude}`
      ).join('|');

      const params = new URLSearchParams({
        origins: originsStr,
        destinations: destinationsStr,
        key: this.API_KEY,
        mode: options.mode || 'driving',
        units: 'metric',
        language: 'pt-BR',
        avoid: options.avoid || '',
      });

      const url = `${this.BASE_URL}/distancematrix/json?${params.toString()}`;
      
      console.log('📊 Calculando matriz de distâncias');
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ Matriz de distâncias calculada');
        
        return {
          success: true,
          data: {
            origin_addresses: data.origin_addresses,
            destination_addresses: data.destination_addresses,
            rows: data.rows.map(row => ({
              elements: row.elements.map(element => ({
                distance: element.distance,
                duration: element.duration,
                status: element.status,
              }))
            }))
          }
        };
      } else {
        throw new Error(data.error_message || 'Erro no cálculo da matriz');
      }
    } catch (error) {
      console.error('❌ Erro na matriz de distâncias:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar lugares próximos (restaurantes, farmácias, etc.)
   */
  async findNearbyPlaces(location, radius = 1000, type = 'restaurant') {
    try {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        radius: radius.toString(),
        type: type,
        key: this.API_KEY,
        language: 'pt-BR',
      });

      const url = `${this.BASE_URL}/place/nearbysearch/json?${params.toString()}`;
      
      console.log('🔍 Buscando lugares próximos:', type, 'em', radius, 'm');
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ Encontrados', data.results.length, 'lugares');
        
        return {
          success: true,
          data: data.results.map(place => ({
            place_id: place.place_id,
            name: place.name,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            vicinity: place.vicinity,
            types: place.types,
            geometry: place.geometry,
            photos: place.photos,
            price_level: place.price_level,
            opening_hours: place.opening_hours,
          }))
        };
      } else {
        throw new Error(data.error_message || 'Nenhum lugar encontrado');
      }
    } catch (error) {
      console.error('❌ Erro na busca de lugares:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter detalhes de um lugar específico
   */
  async getPlaceDetails(placeId, fields = ['formatted_address', 'geometry', 'name', 'rating']) {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        fields: fields.join(','),
        key: this.API_KEY,
        language: 'pt-BR',
      });

      const url = `${this.BASE_URL}/place/details/json?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return {
          success: true,
          data: data.result
        };
      } else {
        throw new Error(data.error_message || 'Lugar não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro nos detalhes do lugar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Decodificar polyline (para desenhar rota no mapa)
   */
  decodePolyline(encoded) {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      points.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5,
      });
    }

    return points;
  }

  /**
   * Calcular distância usando fórmula Haversine (para cálculos offline)
   */
  calculateHaversineDistance(point1, point2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // em quilômetros
  }

  /**
   * Converter graus para radianos
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcular bearing (direção) entre dois pontos
   */
  calculateBearing(point1, point2) {
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180 / Math.PI + 360) % 360;
    
    return bearing;
  }

  /**
   * Formatar duração em texto legível
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes} min`;
    }
  }

  /**
   * Formatar distância em texto legível
   */
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(1)} km`;
    }
  }

  /**
   * Validar se as coordenadas são válidas
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Obter região do mapa para múltiplos pontos
   */
  getMapRegion(points, padding = 0.01) {
    if (!points || points.length === 0) {
      return null;
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    points.forEach(point => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) + padding;
    const lngDelta = (maxLng - minLng) + padding;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }

  /**
   * Buscar autocomplete de endereços
   */
  async getPlaceAutocomplete(input, options = {}) {
    try {
      const params = new URLSearchParams({
        input: input,
        key: this.API_KEY,
        language: 'pt-BR',
        components: options.country ? `country:${options.country}` : '',
        types: options.types || '',
        radius: options.radius || '',
        location: options.location ? `${options.location.latitude},${options.location.longitude}` : '',
      });

      // Remover parâmetros vazios
      for (const [key, value] of [...params]) {
        if (!value) {
          params.delete(key);
        }
      }

      const url = `${this.BASE_URL}/place/autocomplete/json?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return {
          success: true,
          data: data.predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting,
            types: prediction.types,
            matched_substrings: prediction.matched_substrings,
          }))
        };
      } else {
        throw new Error(data.error_message || 'Nenhuma sugestão encontrada');
      }
    } catch (error) {
      console.error('❌ Erro no autocomplete:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar se um ponto está dentro de um raio
   */
  isWithinRadius(center, point, radiusKm) {
    const distance = this.calculateHaversineDistance(center, point);
    return distance <= radiusKm;
  }

  /**
   * Obter pontos ao longo de uma rota (para animação)
   */
  getRoutePoints(polylinePoints, intervalMeters = 100) {
    const points = [];
    
    for (let i = 0; i < polylinePoints.length - 1; i++) {
      const start = polylinePoints[i];
      const end = polylinePoints[i + 1];
      
      const distance = this.calculateHaversineDistance(start, end) * 1000; // em metros
      const steps = Math.floor(distance / intervalMeters);
      
      for (let j = 0; j <= steps; j++) {
        const ratio = j / steps;
        const lat = start.latitude + (end.latitude - start.latitude) * ratio;
        const lng = start.longitude + (end.longitude - start.longitude) * ratio;
        
        points.push({ latitude: lat, longitude: lng });
      }
    }
    
    return points;
  }

  /**
   * Cache para requisições recentes (evitar calls desnecessárias)
   */
  _cache = new Map();
  _cacheTimeout = 5 * 60 * 1000; // 5 minutos

  _getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }

  _getFromCache(key) {
    const cached = this._cache.get(key);
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      console.log('📦 Usando resultado do cache para:', key);
      return cached.data;
    }
    return null;
  }

  _setCache(key, data) {
    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    if (this._cache.size > 100) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }
  }

  /**
   * Limpar cache manualmente
   */
  clearCache() {
    this._cache.clear();
    console.log('🗑️ Cache do Google Maps limpo');
  }
}

export default new GoogleMapsService();