// App.js - Versão Final com Onboarding
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RealHomeScreen from './src/screens/RealHomeScreen';
import RealOrderDetailsScreen from './src/screens/RealOrderDetailsScreen';
import RealHistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RealMapDeliveryScreen from './src/screens/RealMapDeliveryScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { DeliveryProvider } from './src/context/DeliveryContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

// Tela de Loading
function LoadingScreen({ message = "Carregando..." }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary[100]} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary[100],
        tabBarInactiveTintColor: colors.gray[100],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          height: 80,
          paddingBottom: 20,
          paddingTop: 10
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'RealHome') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'RealHistory') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="RealHome" component={RealHomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="RealHistory" component={RealHistoryScreen} options={{ tabBarLabel: 'Histórico' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// Navigator principal
function AppNavigator() {
  const { isAuthenticated, loading: authLoading, isInitialized } = useAuth();
  const { shouldShowOnboarding, loading: onboardingLoading } = useOnboarding();

  // Mostrar loading durante inicialização
  if (!isInitialized || authLoading || onboardingLoading) {
    return <LoadingScreen message="Iniciando aplicação..." />;
  }

  // Mostrar onboarding se for primeira vez
  if (shouldShowOnboarding()) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Usuário autenticado - Telas principais
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="RealOrderDetails" 
              component={RealOrderDetailsScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="RealMapDelivery" 
              component={RealMapDeliveryScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
          </>
        ) : (
          // Usuário não autenticado - Telas de autenticação
          <>
   
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// App principal
export default function App() {
  return (
    <OnboardingProvider>
      <AuthProvider>
        <DeliveryProvider>
          <View style={styles.container}>
            <StatusBar style="auto" />
            <AppNavigator />
          </View>
        </DeliveryProvider>
      </AuthProvider>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.typography[50],
    textAlign: 'center',
  },
});