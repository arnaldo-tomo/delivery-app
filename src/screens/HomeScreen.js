// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert
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

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { availableDeliveries, activeDelivery, loading, fetchAvailableDeliveries } = useDelivery();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log("ddd",fetchAvailableDeliveries);
    fetchAvailableDeliveries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAvailableDeliveries();
    setRefreshing(false);
  };

  const renderDeliveryCard = ({ item }) => (

    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => navigation.navigate('DeliveryDetails', { delivery: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{item.restaurant}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>{item.payment}</Text>
        </View>
      </View>

      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color={colors.typography[20]} />
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.distanceTime}>
          <View style={styles.distanceTimeItem}>
            <Ionicons name="car-outline" size={16} color={colors.primary[100]} />
            <Text style={styles.distanceTimeText}>{item.distance}</Text>
          </View>
          <View style={styles.distanceTimeItem}>
            <Ionicons name="time-outline" size={16} color={colors.primary[100]} />
            <Text style={styles.distanceTimeText}>{item.estimatedTime}</Text>
          </View>
        </View>
        <Text style={styles.totalAmount}>{item.total}</Text>
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
            <Text style={styles.activeCustomerName}>{activeDelivery.customerName}</Text>
            <Text style={styles.activeAddress}>{activeDelivery.address}</Text>
            <View style={styles.activeCardFooter}>
              <Text style={styles.activeTotal}>{activeDelivery.total}</Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.navigate('OngoingDelivery')}
              >
                <Text style={styles.continueButtonText}>Continuar</Text>
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
          <Text style={styles.subtitle}>Entregas disponíveis</Text>
        </View>
      </View>

      <FlatList
        data={availableDeliveries}
        renderItem={renderDeliveryCard}
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
            <Text style={styles.emptySubtitle}>Puxe para baixo para atualizar</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingBottom:200;
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
    // marginTop:80,
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
  listContainer: {
    padding: 24,
    gap: 16,
  },
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
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
  paymentBadge: {
    backgroundColor: colors.secondary[20],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary[100],
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.typography[50],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceTime: {
    flexDirection: 'row',
    gap: 16,
  },
  distanceTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceTimeText: {
    fontSize: 12,
    color: colors.typography[50],
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
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
    borderWidth: 1,
    borderColor: colors.primary[20],
  },
  activeCustomerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 8,
  },
  activeAddress: {
    fontSize: 14,
    color: colors.typography[20],
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
    backgroundColor: colors.primary[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
  },
});
