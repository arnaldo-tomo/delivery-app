// src/services/LocationService.js
import * as Location from 'expo-location';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
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
    
    return this.currentLocation;
  }

  async startLocationTracking(callback) {
    await this.requestPermissions();
    
    this.watchId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10, // 10 meters
      },
      (location) => {
        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        callback(this.currentLocation);
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  // Geocoding real com Google Maps API
  async geocodeAddress(address, apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formatted_address: result.formatted_address,
        };
      }
      throw new Error('Endereço não encontrado');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Calcular rota real com Google Directions API
  async getDirections(origin, destination, apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          distance: leg.distance.text,
          duration: leg.duration.text,
          polyline: route.overview_polyline.points,
          steps: leg.steps,
        };
      }
      throw new Error('Rota não encontrada');
    } catch (error) {
      console.error('Directions error:', error);
      throw error;
    }
  }

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
}

export default new LocationService();