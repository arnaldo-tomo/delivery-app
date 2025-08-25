// src/screens/DeliveryDetailsScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking
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

export default function DeliveryDetailsScreen({ route, navigation }) {
  const { delivery } = route.params;
  const { acceptDelivery } = useDelivery();

  const handleAcceptDelivery = async () => {
    Alert.alert(
      'Aceitar Entrega',
      'Tem certeza que deseja aceitar esta entrega?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            const result = await acceptDelivery(delivery.id);
            if (result.success) {
              navigation.navigate('OngoingDelivery');
            } else {
              Alert.alert('Erro', result.error);
            }
          }
        }
      ]
    );
  };

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${delivery.customerPhone}`);
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.typography[100]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Entrega</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantHeader}>
            <Ionicons name="restaurant" size={24} color={colors.primary[100]} />
            <Text style={styles.restaurantName}>{delivery.restaurant}</Text>
          </View>
        </View>

        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Cliente</Text>
          </View>
          <Text style={styles.customerName}>{delivery.customerName}</Text>
          <TouchableOpacity 
            style={styles.phoneButton}
            onPress={handleCallCustomer}
          >
            <Ionicons name="call" size={16} color={colors.primary[100]} />
            <Text style={styles.phoneText}>{delivery.customerPhone}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Endereço de Entrega</Text>
          </View>
          <Text style={styles.address}>{delivery.address}</Text>
          <TouchableOpacity 
            style={styles.mapsButton}
            onPress={handleOpenMaps}
          >
            <Ionicons name="map" size={16} color={colors.secondary[100]} />
            <Text style={styles.mapsText}>Abrir no Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Itens do Pedido</Text>
          </View>
          {delivery.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distância:</Text>
            <Text style={styles.summaryValue}>{delivery.distance}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tempo estimado:</Text>
            <Text style={styles.summaryValue}>{delivery.estimatedTime}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Forma de pagamento:</Text>
            <Text style={styles.summaryValue}>{delivery.payment}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{delivery.total}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.rejectButtonText}>Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={handleAcceptDelivery}
        >
          <Text style={styles.acceptButtonText}>Aceitar Entrega</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  restaurantCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary[20],
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
  },
  customerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[80],
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.typography[100],
    marginBottom: 8,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    color: colors.primary[100],
    fontWeight: '500',
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  address: {
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 20,
    marginBottom: 12,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapsText: {
    fontSize: 14,
    color: colors.secondary[100],
    fontWeight: '500',
  },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  itemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  itemText: {
    fontSize: 14,
    color: colors.typography[100],
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.typography[50],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[100],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[50],
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[50],
  },
  acceptButton: {
    flex: 2,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});