// src/screens/DeliverySettingsScreen.js - Configurações avançadas para entregadores
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Slider,
  Alert,
  Modal,
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
  background: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444',
};

export default function DeliverySettingsScreen({ navigation }) {
  const { user } = useAuth();
  const {
    deliveryRadius,
    isOnline,
    currentLocation,
    locationPermission,
    updateDeliveryRadius,
    toggleOnlineStatus,
    fetchDeliveryStats,
  } = useDelivery();

  // Estados locais
  const [settings, setSettings] = useState({
    radiusKm: deliveryRadius,
    notifications: true,
    autoAccept: false,
    soundAlerts: true,
    vibration: true,
    highAccuracy: true,
    backgroundLocation: true,
  });
  
  const [stats, setStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const result = await fetchDeliveryStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const handleRadiusChange = async (newRadius) => {
    const result = await updateDeliveryRadius(newRadius);
    if (result.success) {
      setSettings(prev => ({ ...prev, radiusKm: newRadius }));
      Alert.alert('Sucesso', `Raio de entrega atualizado para ${newRadius}km`);
    } else {
      Alert.alert('Erro', result.error);
    }
  };

  const handleToggleOnline = async () => {
    const result = await toggleOnlineStatus();
    if (!result.success) {
      Alert.alert('Erro', result.error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.typography[100]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Configurações</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderLocationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📍 Localização e Raio</Text>
      
      {/* Status da Localização */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Status da Localização</Text>
          <Text style={[
            styles.settingValue,
            { color: currentLocation ? colors.success : colors.error }
          ]}>
            {currentLocation ? 'Ativa' : 'Inativa'}
          </Text>
        </View>
        <Ionicons 
          name={currentLocation ? "location" : "location-outline"} 
          size={24} 
          color={currentLocation ? colors.success : colors.error} 
        />
      </View>

      {/* Coordenadas Atuais */}
      {currentLocation && (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesLabel}>Coordenadas Atuais:</Text>
          <Text style={styles.coordinates}>
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Raio de Entrega */}
      <View style={styles.sliderSection}>
        <Text style={styles.settingLabel}>Raio de Entrega</Text>
        <Text style={styles.settingDescription}>
          Distância máxima para receber pedidos
        </Text>
        
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>1km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={15}
            value={settings.radiusKm}
            onValueChange={(value) => setSettings(prev => ({ ...prev, radiusKm: value }))}
            onSlidingComplete={handleRadiusChange}
            step={0.5}
            minimumTrackTintColor={colors.primary[100]}
            maximumTrackTintColor={colors.gray[50]}
          />
          <Text style={styles.sliderLabel}>15km</Text>
        </View>
        
        <View style={styles.radiusDisplay}>
          <Text style={styles.radiusValue}>{settings.radiusKm.toFixed(1)}km</Text>
        </View>
      </View>
    </View>
  );

  const renderStatusSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔄 Status de Trabalho</Text>
      
      {/* Toggle Online/Offline */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Status Online</Text>
          <Text style={styles.settingDescription}>
            {isOnline ? 'Recebendo pedidos' : 'Não disponível para entregas'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: colors.gray[50], true: colors.success }}
          thumbColor={isOnline ? colors.white : colors.gray[20]}
        />
      </View>

      {/* Indicador Visual */}
      <View style={[
        styles.statusIndicator,
        { backgroundColor: isOnline ? colors.success : colors.gray[100] }
      ]}>
        <View style={styles.statusIcon}>
          <Ionicons 
            name={isOnline ? "checkmark-circle" : "pause-circle"} 
            size={24} 
            color={colors.white} 
          />
        </View>
        <Text style={styles.statusText}>
          {isOnline ? 'ONLINE - Disponível' : 'OFFLINE - Indisponível'}
        </Text>
      </View>
    </View>
  );

  const renderNotificationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔔 Notificações</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Novos Pedidos</Text>
          <Text style={styles.settingDescription}>
            Receber notificações de pedidos disponíveis
          </Text>
        </View>
        <Switch
          value={settings.notifications}
          onValueChange={(value) => setSettings(prev => ({ ...prev, notifications: value }))}
          trackColor={{ false: colors.gray[50], true: colors.primary[100] }}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Sons de Alerta</Text>
          <Text style={styles.settingDescription}>
            Reproduzir som ao receber novos pedidos
          </Text>
        </View>
        <Switch
          value={settings.soundAlerts}
          onValueChange={(value) => setSettings(prev => ({ ...prev, soundAlerts: value }))}
          trackColor={{ false: colors.gray[50], true: colors.primary[100] }}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Vibração</Text>
          <Text style={styles.settingDescription}>
            Vibrar o dispositivo para alertas
          </Text>
        </View>
        <Switch
          value={settings.vibration}
          onValueChange={(value) => setSettings(prev => ({ ...prev, vibration: value }))}
          trackColor={{ false: colors.gray[50], true: colors.primary[100] }}
        />
      </View>
    </View>
  );

  const renderAdvancedSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>⚙️ Configurações Avançadas</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Aceitação Automática</Text>
          <Text style={styles.settingDescription}>
            Aceitar automaticamente pedidos próximos (experimental)
          </Text>
        </View>
        <Switch
          value={settings.autoAccept}
          onValueChange={(value) => {
            if (value) {
              Alert.alert(
                'Atenção',
                'A aceitação automática é experimental. Use com cuidado.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Ativar', 
                    onPress: () => setSettings(prev => ({ ...prev, autoAccept: true }))
                  }
                ]
              );
            } else {
              setSettings(prev => ({ ...prev, autoAccept: false }));
            }
          }}
          trackColor={{ false: colors.gray[50], true: colors.secondary[100] }}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>GPS de Alta Precisão</Text>
          <Text style={styles.settingDescription}>
            Maior precisão, mas consome mais bateria
          </Text>
        </View>
        <Switch
          value={settings.highAccuracy}
          onValueChange={(value) => setSettings(prev => ({ ...prev, highAccuracy: value }))}
          trackColor={{ false: colors.gray[50], true: colors.primary[100] }}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Localização em Segundo Plano</Text>
          <Text style={styles.settingDescription}>
            Manter localização ativa quando o app estiver fechado
          </Text>
        </View>
        <Switch
          value={settings.backgroundLocation}
          onValueChange={(value) => setSettings(prev => ({ ...prev, backgroundLocation: value }))}
          trackColor={{ false: colors.gray[50], true: colors.primary[100] }}
        />
      </View>
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
      
      <TouchableOpacity 
        style={styles.statsButton}
        onPress={() => setShowStatsModal(true)}
      >
        <View style={styles.statsButtonContent}>
          <Ionicons name="analytics" size={24} color={colors.primary[100]} />
          <View style={styles.statsButtonText}>
            <Text style={styles.statsButtonTitle}>Ver Estatísticas Completas</Text>
            <Text style={styles.statsButtonSubtitle}>
              Desempenho, ganhos e métricas detalhadas
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.gray[100]} />
      </TouchableOpacity>

      {stats && (
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.estatisticas?.hoje?.entregas_realizadas || 0}</Text>
            <Text style={styles.statLabel}>Hoje</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.estatisticas?.esta_semana?.entregas_realizadas || 0}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.estatisticas?.geral?.total_entregas || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowStatsModal(false)}>
            <Ionicons name="close" size={24} color={colors.typography[100]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Estatísticas Detalhadas</Text>
          <TouchableOpacity onPress={loadStats}>
            <Ionicons name="refresh" size={24} color={colors.primary[100]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {stats ? (
            <>
              {/* Estatísticas de Hoje */}
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>📅 Hoje</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>{stats.estatisticas.hoje.entregas_realizadas}</Text>
                    <Text style={styles.statsLabel}>Entregas</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>
                      MT {stats.estatisticas.hoje.receita_estimada.toFixed(2)}
                    </Text>
                    <Text style={styles.statsLabel}>Receita</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>{stats.estatisticas.hoje.tempo_online}</Text>
                    <Text style={styles.statsLabel}>Min Online</Text>
                  </View>
                </View>
              </View>

              {/* Estatísticas da Semana */}
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>📊 Esta Semana</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>{stats.estatisticas.esta_semana.entregas_realizadas}</Text>
                    <Text style={styles.statsLabel}>Entregas</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>
                      MT {stats.estatisticas.esta_semana.receita_estimada.toFixed(2)}
                    </Text>
                    <Text style={styles.statsLabel}>Receita</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.statsNumber}>{stats.estatisticas.esta_semana.dias_ativos}</Text>
                    <Text style={styles.statsLabel}>Dias Ativos</Text>
                  </View>
                </View>
              </View>

              {/* Badges/Conquistas */}
              {stats.badges && stats.badges.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={styles.statsCardTitle}>🏆 Conquistas</Text>
                  <View style={styles.badgesContainer}>
                    {stats.badges.map((badge, index) => (
                      <View key={index} style={styles.badge}>
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDescription}>{badge.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text>Carregando estatísticas...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderLocationSection()}
        {renderStatusSection()}
        {renderNotificationSection()}
        {renderAdvancedSection()}
        {renderStatsSection()}
      </ScrollView>

      {renderStatsModal()}
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.typography[100],
  },
  settingDescription: {
    fontSize: 13,
    color: colors.typography[50],
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  coordinatesContainer: {
    backgroundColor: colors.gray[20],
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: colors.typography[50],
  },
  coordinates: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.typography[100],
    fontWeight: '500',
  },
  sliderSection: {
    marginTop: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.typography[50],
  },
  radiusDisplay: {
    alignItems: 'center',
    marginTop: 8,
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusIcon: {
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[20],
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  statsButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
  },
  statsButtonSubtitle: {
    fontSize: 13,
    color: colors.typography[50],
    marginTop: 2,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  statLabel: {
    fontSize: 12,
    color: colors.typography[50],
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[100],
  },
  statsLabel: {
    fontSize: 12,
    color: colors.typography[50],
    marginTop: 4,
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.gray[20],
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.typography[100],
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 10,
    color: colors.typography[50],
    textAlign: 'center',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});