// src/screens/RealOrderDetailsScreen.js
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

export default function RealOrderDetailsScreen({ route, navigation }) {
  const { order } = route.params;
  const { acceptOrder } = useDelivery();

  const formatCurrency = (amount) => {
    return `MT ${parseFloat(amount).toFixed(2)}`;
  };

  const handleAcceptOrder = async () => {
    Alert.alert(
      'Aceitar Entrega',
      `Tem certeza que deseja aceitar o pedido #${order.order_number}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            const result = await acceptOrder(order.id);
            if (result.success) {
              Alert.alert(
                'Sucesso!',
                'Pedido aceito com sucesso!',
                [{ text: 'OK', onPress: () => navigation.navigate('RealMapDelivery', { order }) }]
              );
            } else {
              Alert.alert('Erro', result.error);
            }
          }
        }
      ]
    );
  };

  const handleCallCustomer = () => {
    const phone = order.customer?.phone || order.delivery_address?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Erro', 'Número de telefone não disponível');
    }
  };

  const handleCallRestaurant = () => {
    const phone = order.restaurant?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Erro', 'Número do restaurante não disponível');
    }
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
        <Text style={styles.headerTitle}>
          Pedido #{order.order_number}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações do Restaurante */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantHeader}>
            <Ionicons name="restaurant" size={24} color={colors.secondary[100]} />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>
                {order.restaurant?.name || 'Restaurante'}
              </Text>
              <Text style={styles.restaurantAddress}>
                {order.restaurant?.address || 'Endereço não disponível'}
              </Text>
            </View>
            {order.restaurant?.phone && (
              <TouchableOpacity 
                style={styles.phoneButton}
                onPress={handleCallRestaurant}
              >
                <Ionicons name="call" size={16} color={colors.secondary[100]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Informações do Cliente */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Cliente</Text>
          </View>
          <Text style={styles.customerName}>
            {order.customer?.name || 'Cliente'}
          </Text>
          {(order.customer?.phone || order.delivery_address?.phone) && (
            <TouchableOpacity 
              style={styles.phoneContainer}
              onPress={handleCallCustomer}
            >
              <Ionicons name="call" size={16} color={colors.primary[100]} />
              <Text style={styles.phoneText}>
                {order.customer?.phone || order.delivery_address?.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Endereço de Entrega */}
        <View style={styles.addressCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Endereço de Entrega</Text>
          </View>
          <Text style={styles.address}>
            {order.delivery_address?.address || 
             order.delivery_address?.street || 
             'Endereço não disponível'}
          </Text>
          {order.delivery_address?.complement && (
            <Text style={styles.addressComplement}>
              {order.delivery_address.complement}
            </Text>
          )}
        </View>

        {/* Itens do Pedido */}
        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag" size={20} color={colors.typography[80]} />
            <Text style={styles.cardTitle}>Itens do Pedido</Text>
          </View>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.menu_item?.name || 'Item'}
                  </Text>
                  {item.menu_item?.description && (
                    <Text style={styles.itemDescription}>
                      {item.menu_item.description}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>
                  {formatCurrency(item.price || item.menu_item?.price || 0)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItems}>Itens não disponíveis</Text>
          )}
        </View>

        {/* Resumo do Pedido */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(order.subtotal || 0)}
            </Text>
          </View>
          
          {order.delivery_fee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxa de entrega:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.delivery_fee)}
              </Text>
            </View>
          )}
          
          {order.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxas:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.tax_amount)}
              </Text>
            </View>
          )}
          
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desconto:</Text>
              <Text style={[styles.summaryValue, { color: colors.primary[100] }]}>
                -{formatCurrency(order.discount_amount)}
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Forma de pagamento:</Text>
            <Text style={styles.summaryValue}>
              {order.payment_method || 'Não informado'}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* Observações */}
        {order.notes && (
          <View style={styles.notesCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={20} color={colors.typography[80]} />
              <Text style={styles.cardTitle}>Observações</Text>
            </View>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Botões de Ação */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.rejectButtonText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={handleAcceptOrder}
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
    borderColor: colors.secondary[20],
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: colors.typography[50],
  },
  phoneButton: {
    padding: 8,
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
  phoneContainer: {
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
  },
  addressComplement: {
    fontSize: 14,
    color: colors.typography[20],
    marginTop: 4,
    fontStyle: 'italic',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
    gap: 12,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[100],
    minWidth: 30,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[100],
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.typography[20],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[100],
  },
  noItems: {
    fontSize: 14,
    color: colors.typography[20],
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  notesCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  notesText: {
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 20,
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