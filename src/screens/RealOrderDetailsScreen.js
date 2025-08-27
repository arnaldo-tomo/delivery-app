// src/screens/RealOrderDetailsScreen.js - Versão CORRIGIDA
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelivery } from '../context/DeliveryContext';

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444'
};

export default function RealOrderDetailsScreen({ route, navigation }) {
  const { order } = route.params;
  const { acceptOrder } = useDelivery();

  /**
   * FUNÇÕES DE FORMATAÇÃO - VERSÕES CORRIGIDAS
   */
  
  const formatCurrency = (amount) => {
    if (!amount) return 'MT 0,00';
    const numAmount = parseFloat(amount);
    return `MT ${numAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getOrderStatusText = (status) => {
    const statusMap = {
      'pending': 'Aguardando',
      'confirmed': 'Confirmado', 
      'preparing': 'Preparando',
      'ready': 'Pronto para Coleta',
      'picked_up': 'Coletado',
      'out_for_delivery': 'Saiu para Entrega',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status?.toUpperCase() || 'N/A';
  };

  /**
   * Função CORRIGIDA para extrair endereço de entrega
   * Esta é a causa do erro - estava tentando renderizar um objeto
   */
  const getDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return 'Endereço não disponível';
    
    // Se for string, tentar fazer parse do JSON
    if (typeof deliveryAddress === 'string') {
      try {
        const parsed = JSON.parse(deliveryAddress);
        return getDeliveryAddress(parsed);
      } catch {
        return deliveryAddress;
      }
    }
    
    // Se for objeto, extrair componentes
    if (typeof deliveryAddress === 'object') {
      const parts = [];
      
      // Verificar diferentes estruturas possíveis
      if (deliveryAddress.street) {
        // Se street for objeto ou array
        if (typeof deliveryAddress.street === 'object') {
          if (Array.isArray(deliveryAddress.street)) {
            parts.push(...deliveryAddress.street.filter(Boolean));
          } else {
            // Se street for um objeto, tentar extrair valores
            Object.values(deliveryAddress.street).forEach(val => {
              if (val && typeof val === 'string') parts.push(val);
            });
          }
        } else {
          parts.push(deliveryAddress.street);
        }
      }
      
      // Adicionar outros campos
      if (deliveryAddress.address) parts.push(deliveryAddress.address);
      if (deliveryAddress.neighborhood) parts.push(deliveryAddress.neighborhood);
      if (deliveryAddress.district) parts.push(deliveryAddress.district);
      if (deliveryAddress.city) parts.push(deliveryAddress.city);
      
      // Filtrar valores vazios e retornar
      const filtered = parts.filter(part => part && part.toString().trim());
      return filtered.length > 0 ? filtered.join(', ') : 'Endereço não disponível';
    }
    
    return 'Endereço não disponível';
  };

  /**
   * Função para obter complemento do endereço
   */
  const getAddressComplement = (deliveryAddress) => {
    if (!deliveryAddress || typeof deliveryAddress !== 'object') return null;
    
    const complements = [];
    if (deliveryAddress.complement) complements.push(deliveryAddress.complement);
    if (deliveryAddress.reference) complements.push(`Ref: ${deliveryAddress.reference}`);
    if (deliveryAddress.floor) complements.push(`${deliveryAddress.floor}º andar`);
    if (deliveryAddress.apartment) complements.push(`Apt ${deliveryAddress.apartment}`);
    
    return complements.length > 0 ? complements.join(' • ') : null;
  };

  /**
   * Função para obter método de pagamento formatado
   */
  const getPaymentMethodDisplay = (paymentMethod) => {
    const methodMap = {
      'cash': 'Dinheiro',
      'mpesa': 'M-Pesa',
      'card': 'Cartão',
      'bank_transfer': 'Transferência Bancária'
    };
    
    return methodMap[paymentMethod] || paymentMethod?.toUpperCase() || 'Não informado';
  };

  /**
   * Função para obter telefone do cliente
   */
  const getCustomerPhone = () => {
    // Priorizar telefone do customer, depois do delivery_address
    if (order.customer?.phone) return order.customer.phone;
    
    if (order.delivery_address && typeof order.delivery_address === 'object') {
      if (order.delivery_address.phone) return order.delivery_address.phone;
    }
    
    return null;
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
    const phone = getCustomerPhone();
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Erro', 'Número de telefone do cliente não disponível');
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

  // Dados formatados
  const deliveryAddress = getDeliveryAddress(order.delivery_address);
  const addressComplement = getAddressComplement(order.delivery_address);
  const customerPhone = getCustomerPhone();
  const paymentMethodText = getPaymentMethodDisplay(order.payment_method);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.typography[100]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Pedido #{order.order_number || 'N/A'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getOrderStatusText(order.status)}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações do Restaurante */}
        <View style={styles.restaurantCard}>
          <View style={styles.cardHeader}>
            <View style={styles.restaurantImageContainer}>
              {order.restaurant?.image ? (
                <Image 
                  source={{ uri: order.restaurant.image }} 
                  style={styles.restaurantImage}
                />
              ) : (
                <View style={styles.restaurantImagePlaceholder}>
                  <Ionicons name="restaurant" size={20} color={colors.secondary[100]} />
                </View>
              )}
            </View>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>
                {order.restaurant?.name || 'Restaurante não informado'}
              </Text>
              <Text style={styles.restaurantAddress}>
                {order.restaurant?.address || 'Endereço não disponível'}
              </Text>
              {order.restaurant?.phone && (
                <View style={styles.contactInfo}>
                  <Ionicons name="call" size={14} color={colors.success} />
                  <Text style={styles.contactText}>{order.restaurant.phone}</Text>
                </View>
              )}
            </View>
            {order.restaurant?.phone && (
              <TouchableOpacity 
                style={styles.phoneButton}
                onPress={handleCallRestaurant}
              >
                <Ionicons name="call" size={18} color={colors.secondary[100]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Informações do Cliente */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={20} color={colors.primary[100]} />
            </View>
            <Text style={styles.cardTitle}>Informações do Cliente</Text>
          </View>
          
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {order.customer?.name || 'Cliente não informado'}
            </Text>
            
            {customerPhone && (
              <TouchableOpacity 
                style={styles.phoneContainer}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={16} color={colors.success} />
                <Text style={styles.phoneText}>{customerPhone}</Text>
                <Text style={styles.phoneAction}>Tocar para ligar</Text>
              </TouchableOpacity>
            )}
            
            {order.customer?.email && (
              <View style={styles.contactInfo}>
                <Ionicons name="mail" size={14} color={colors.typography[50]} />
                <Text style={styles.contactText}>{order.customer.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Endereço de Entrega */}
        <View style={styles.addressCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color={colors.primary[100]} />
            </View>
            <Text style={styles.cardTitle}>Endereço de Entrega</Text>
          </View>
          
          <View style={styles.addressInfo}>
            <Text style={styles.address}>{deliveryAddress}</Text>
            
            {addressComplement && (
              <Text style={styles.addressComplement}>{addressComplement}</Text>
            )}
            
            {order.delivery_address?.latitude && order.delivery_address?.longitude && (
              <View style={styles.coordinatesInfo}>
                <Ionicons name="navigate" size={14} color={colors.typography[50]} />
                <Text style={styles.coordinatesText}>
                  {order.delivery_address.latitude.toFixed(6)}, {order.delivery_address.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Itens do Pedido */}
        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="bag" size={20} color={colors.secondary[100]} />
            </View>
            <Text style={styles.cardTitle}>
              Itens do Pedido ({order.items?.length || 0})
            </Text>
          </View>
          
          {order.items && order.items.length > 0 ? (
            <View style={styles.itemsList}>
              {order.items.map((item, index) => (
                <View key={index} style={[
                  styles.itemRow,
                  index === order.items.length - 1 && styles.lastItemRow
                ]}>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.itemQuantity}>{item.quantity || 1}</Text>
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.menu_item?.name || item.name || 'Item'}
                    </Text>
                    {item.menu_item?.description && (
                      <Text style={styles.itemDescription}>
                        {item.menu_item.description}
                      </Text>
                    )}
                    {item.notes && (
                      <Text style={styles.itemNotes}>
                        Obs: {item.notes}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemUnitPrice}>
                      {formatCurrency(item.price || item.menu_item?.price || 0)}
                    </Text>
                    {item.quantity > 1 && (
                      <Text style={styles.itemTotalPrice}>
                        Total: {formatCurrency((item.price || item.menu_item?.price || 0) * item.quantity)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noItemsContainer}>
              <Ionicons name="bag-outline" size={48} color={colors.gray[100]} />
              <Text style={styles.noItemsText}>Itens não disponíveis</Text>
            </View>
          )}
        </View>

        {/* Resumo Financeiro */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="receipt" size={20} color={colors.primary[100]} />
            </View>
            <Text style={styles.cardTitle}>Resumo do Pedido</Text>
          </View>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.subtotal || 0)}
              </Text>
            </View>
            
            {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxa de entrega:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.delivery_fee)}
                </Text>
              </View>
            )}
            
            {order.tax_amount && parseFloat(order.tax_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Impostos:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.tax_amount)}
                </Text>
              </View>
            )}
            
            {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Desconto:</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -{formatCurrency(order.discount_amount)}
                </Text>
              </View>
            )}
            
            <View style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Ionicons 
                  name={order.payment_method === 'cash' ? 'cash' : 
                        order.payment_method === 'mpesa' ? 'phone-portrait' : 'card'}
                  size={16} 
                  color={colors.secondary[100]} 
                />
                <Text style={styles.paymentLabel}>Pagamento:</Text>
              </View>
              <Text style={styles.paymentValue}>{paymentMethodText}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Observações */}
        {order.notes && (
          <View style={styles.notesCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={20} color={colors.typography[80]} />
              </View>
              <Text style={styles.cardTitle}>Observações Especiais</Text>
            </View>
            <View style={styles.notesContent}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        {/* Informações Adicionais */}
        <View style={styles.additionalInfoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle" size={20} color={colors.typography[80]} />
            </View>
            <Text style={styles.cardTitle}>Informações Adicionais</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status do Pagamento:</Text>
              <Text style={[
                styles.infoValue,
                { color: order.payment_status === 'paid' ? colors.success : colors.error }
              ]}>
                {order.payment_status === 'paid' ? 'Pago' : 
                 order.payment_status === 'pending' ? 'Pendente' : 
                 order.payment_status || 'N/A'}
              </Text>
            </View>
            
            {order.estimated_pickup_time && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tempo Estimado:</Text>
                <Text style={styles.infoValue}>~{order.estimated_pickup_time}</Text>
              </View>
            )}
            
            {order.created_at && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pedido Realizado:</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.created_at).toLocaleString('pt-BR')}
                </Text>
              </View>
            )}
            
            {order.distance_km && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Distância:</Text>
                <Text style={styles.infoValue}>
                  {parseFloat(order.distance_km) < 1 ? 
                    `${Math.round(parseFloat(order.distance_km) * 1000)}m` :
                    `${parseFloat(order.distance_km).toFixed(1)}km`
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Espaçamento para o footer fixo */}
        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Botões de Ação */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color={colors.typography[50]} />
          <Text style={styles.rejectButtonText}>Voltar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={handleAcceptOrder}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.white} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.typography[50],
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  
  // CARDS GERAIS
  restaurantCard: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.secondary[20],
  },
  customerCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: colors.primary[20],
  },
  notesCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  additionalInfoCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // HEADERS DOS CARDS
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray[20],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  
  // RESTAURANTE
  restaurantImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  restaurantImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary[20],
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 18,
    marginBottom: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: colors.typography[50],
    marginLeft: 4,
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary[20],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // CLIENTE
  customerInfo: {
    marginTop: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  phoneAction: {
    fontSize: 11,
    color: colors.success,
    opacity: 0.8,
  },
  
  // ENDEREÇO
  addressInfo: {
    marginTop: 8,
  },
  address: {
    fontSize: 16,
    color: colors.typography[100],
    lineHeight: 22,
    marginBottom: 4,
  },
  addressComplement: {
    fontSize: 14,
    color: colors.typography[50],
    fontStyle: 'italic',
    marginBottom: 8,
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[20],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  coordinatesText: {
    fontSize: 11,
    color: colors.typography[50],
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  
  // ITENS
  itemsList: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  lastItemRow: {
    borderBottomWidth: 0,
  },
  quantityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.typography[50],
    lineHeight: 16,
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 11,
    color: colors.secondary[100],
    fontStyle: 'italic',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemUnitPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[100],
  },
  itemTotalPrice: {
    fontSize: 11,
    color: colors.typography[50],
    marginTop: 2,
  },
  noItemsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noItemsText: {
    fontSize: 14,
    color: colors.gray[100],
    marginTop: 8,
  },
  
  // RESUMO FINANCEIRO
  summaryContent: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
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
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.gray[20],
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[80],
    marginLeft: 6,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary[100],
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.primary[20],
    marginTop: 12,
    paddingTop: 16,
    backgroundColor: colors.primary[20] + '30',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  
  // OBSERVAÇÕES
  notesContent: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: colors.typography[80],
    lineHeight: 20,
    backgroundColor: colors.gray[20],
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  
  // INFORMAÇÕES ADICIONAIS
  infoGrid: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  infoLabel: {
    fontSize: 13,
    color: colors.typography[50],
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.typography[100],
    flex: 1,
    textAlign: 'right',
  },
  
  // FOOTER
  footerSpacing: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  rejectButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[20],
    flexDirection: 'row',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[50],
  },
  acceptButton: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});