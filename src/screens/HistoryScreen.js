// src/screens/HistoryScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

export default function HistoryScreen() {
  const { deliveryHistory } = useDelivery();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary[100]} />
          <Text style={styles.statusText}>Entregue</Text>
        </View>
        <Text style={styles.dateText}>
          {item.completedAt ? formatDate(item.completedAt) : 'Concluída'}
        </Text>
      </View>

      <View style={styles.deliveryInfo}>
        <Text style={styles.restaurantName}>{item.restaurant}</Text>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={14} color={colors.typography[20]} />
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMethod}>{item.payment}</Text>
        </View>
        <Text style={styles.totalAmount}>{item.total}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Entregas</Text>
      </View>

      <FlatList
        data={deliveryHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.gray[100]} />
            <Text style={styles.emptyTitle}>Nenhuma entrega realizada</Text>
            <Text style={styles.emptySubtitle}>Suas entregas concluídas aparecerão aqui....</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  listContainer: {
    padding: 24,
    gap: 16,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[20],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[100],
  },
  dateText: {
    fontSize: 12,
    color: colors.typography[20],
  },
  deliveryInfo: {
    marginBottom: 16,
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
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  paymentInfo: {
    backgroundColor: colors.secondary[20],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary[100],
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[100],
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
    textAlign: 'center',
  },
});