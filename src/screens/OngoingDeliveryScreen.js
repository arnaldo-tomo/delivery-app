// src/screens/OngoingDeliveryScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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

export default function OngoingDeliveryScreen({ navigation }) {
  const { activeDelivery, updateDeliveryStatus } = useDelivery();
  const [currentStatus, setCurrentStatus] = useState(activeDelivery?.status || 'accepted');

  if (!activeDelivery) {
    navigation.navigate('Home');
    return null;
  }

  const statusSteps = [
    { key: 'accepted', label: 'Aceita', icon: 'checkmark-circle' },
    { key: 'picked_up', label: 'Coletada', icon: 'bag' },
    { key: 'on_route', label: 'A caminho', icon: 'car' },
    { key: 'delivered', label: 'Entregue', icon: 'checkmark-done-circle' }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === currentStatus);
  };

  const handleNextStatus = async () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < statusSteps.length - 1) {
      const nextStatus = statusSteps[currentIndex + 1].key;
      
      if (nextStatus === 'delivered') {
        Alert.alert(
          'Confirmar Entrega',
          'Confirma que a entrega foi realizada com sucesso?',
          [
            { text: 'Não', style: 'cancel' },
            {
              text: 'Sim, entreguei',
              onPress: async () => {
                await updateDeliveryStatus(nextStatus);
                setCurrentStatus(nextStatus);
                Alert.alert(
                  'Entrega Concluída!',
                  'Parabéns! A entrega foi realizada com sucesso.',
                  [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                );
              }
            }
          ]
        );
      } else {
        await updateDeliveryStatus(nextStatus);
        setCurrentStatus(nextStatus);
      }
    }
  };

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${activeDelivery.customerPhone}`);
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeDelivery.address)}`;
    Linking.openURL(url);
  };

  const getNextActionText = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === statusSteps.length - 1) return 'Entrega Concluída';
    
    const nextStep = statusSteps[currentIndex + 1];
    switch (nextStep.key) {
      case 'picked_up': return 'Marcar como Coletada';
      case 'on_route': return 'Iniciar Entrega';
      case 'delivered': return 'Marcar como Entregue';
      default: return 'Próximo Status';
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
        <Text style={styles.headerTitle}>Entrega em Andamento</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Status da Entrega</Text>
          <View style={styles.statusSteps}>
            {statusSteps.map((step, index) => {
              const isCompleted = index <= getCurrentStepIndex();
              const isCurrent = index === getCurrentStepIndex();
              
              return (
                <View key={step.key} style={styles.statusStep}>
                  <View style={[
                    styles.statusIcon,
                    isCompleted ? styles.statusIconCompleted : styles.statusIconPending,
                    isCurrent ? styles.statusIconCurrent : null
                  ]}>
                    <Ionicons 
                      name={step.icon} 
                      size={20} 
                      color={isCompleted ? colors.white : colors.gray[100]} 
                    />
                  </View>
                  <Text style={[
                    styles.statusLabel,
                    isCompleted ? styles.statusLabelCompleted : styles.statusLabelPending
                  ]}>
                    {step.label}
                  </Text>
                  {index < statusSteps.length - 1 && (
                    <View style={[
                      styles.statusLine,
                      isCompleted ? styles.statusLineCompleted : styles.statusLinePending
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeader}>
            <Text style={styles.restaurantName}>{activeDelivery.restaurant}</Text>
            <Text style={styles.totalAmount}>{activeDelivery.total}</Text>
          </View>
          
          <Text style={styles.customerName}>{activeDelivery.customerName}</Text>
          <Text style={styles.address}>{activeDelivery.address}</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallCustomer}
            >
              <Ionicons name="call" size={20} color={colors.white} />
              <Text style={styles.callButtonText}>Ligar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapsButton}
              onPress={handleOpenMaps}
            >
              <Ionicons name="navigate" size={20} color={colors.white} />
              <Text style={styles.mapsButtonText}>Navegar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Itens do Pedido</Text>
          {activeDelivery.items.map((item, index) => (
            <Text key={index} style={styles.itemText}>• {item}</Text>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.nextButton,
            currentStatus === 'delivered' && styles.completedButton
          ]}
          onPress={handleNextStatus}
          disabled={currentStatus === 'delivered'}
        >
          <Text style={styles.nextButtonText}>
            {getNextActionText()}
          </Text>
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
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 20,
    textAlign: 'center',
  },
  statusSteps: {
    alignItems: 'center',
  },
  statusStep: {
    alignItems: 'center',
    position: 'relative',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIconCompleted: {
    backgroundColor: colors.primary[100],
  },
  statusIconPending: {
    backgroundColor: colors.gray[20],
    borderWidth: 2,
    borderColor: colors.gray[50],
  },
  statusIconCurrent: {
    borderWidth: 3,
    borderColor: colors.primary[100],
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  statusLabelCompleted: {
    color: colors.typography[100],
  },
  statusLabelPending: {
    color: colors.gray[100],
  },
  statusLine: {
    width: 2,
    height: 20,
    marginBottom: 16,
  },
  statusLineCompleted: {
    backgroundColor: colors.primary[100],
  },
  statusLinePending: {
    backgroundColor: colors.gray[50],
  },
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[80],
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 20,
    marginBottom: 20,
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
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  callButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  mapsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[100],
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  mapsButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: colors.typography[50],
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  nextButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
  },
  completedButton: {
    backgroundColor: colors.gray[50],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});