import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 1,
      title: 'Informações Pessoais',
      icon: 'person-outline',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
    },
    {
      id: 2,
      title: 'Configurações',
      icon: 'settings-outline',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
    },
    {
      id: 3,
      title: 'Notificações',
      icon: 'notifications-outline',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
    },
    {
      id: 4,
      title: 'Suporte',
      icon: 'help-circle-outline',
      onPress: () => Alert.alert('Suporte', 'Entre em contato: suporte@delivery.com')
    },
    {
      id: 5,
      title: 'Sobre o App',
      icon: 'information-circle-outline',
      onPress: () => Alert.alert('Sobre', 'Delivery App v1.0.0\nDesenvolvido com React Native')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image 
            source={{ 
              uri: user?.avatar || 'https://via.placeholder.com/80x80/FE3801/FFFFFF?text=' + (user?.name?.[0] || 'U')
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Entregador'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'entregador@email.com'}</Text>
            <Text style={styles.userPhone}>{user?.phone || 'Telefone não informado'}</Text>
            <Text style={styles.userAddress}>{user?.address || 'Endereço não informado'}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {user?.is_active ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Informações da Conta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID do Entregador:</Text>
            <Text style={styles.infoValue}>#{user?.id || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Função:</Text>
            <Text style={styles.infoValue}>
              {user?.role === 'delivery_person' ? 'Entregador' : user?.role || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Membro desde:</Text>
            <Text style={styles.infoValue}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon} size={20} color={colors.typography[80]} />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[100]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.primary[100]} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Delivery App v1.0.0</Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 24,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.typography[20],
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: colors.typography[20],
    marginBottom: 4,
  },
  userAddress: {
    fontSize: 14,
    color: colors.typography[20],
    marginBottom: 12,
    textAlign: 'center',
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[100],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[100],
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.typography[100],
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.typography[50],
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[100],
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray[20],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[20],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[20],
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: colors.typography[100],
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary[20],
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[100],
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: colors.gray[100],
  },
});