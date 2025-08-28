// src/context/OnboardingContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      console.log('🔄 Verificando status do onboarding...');
      
      const completed = await AsyncStorage.getItem('onboardingCompleted');
      const isCompleted = completed === 'true';
      
      console.log(`✅ Onboarding ${isCompleted ? 'já foi' : 'não foi'} completado`);
      setIsOnboardingCompleted(isCompleted);
    } catch (error) {
      console.error('❌ Erro ao verificar onboarding:', error);
      // Em caso de erro, assumir que precisa mostrar onboarding
      setIsOnboardingCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      console.log('✅ Marcando onboarding como completo...');
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('❌ Erro ao marcar onboarding como completo:', error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      console.log('🔄 Resetando onboarding...');
      await AsyncStorage.removeItem('onboardingCompleted');
      setIsOnboardingCompleted(false);
    } catch (error) {
      console.error('❌ Erro ao resetar onboarding:', error);
      throw error;
    }
  };

  const shouldShowOnboarding = () => {
    return !isOnboardingCompleted;
  };

  const getDebugInfo = () => {
    return {
      isOnboardingCompleted,
      shouldShowOnboarding: shouldShowOnboarding(),
      loading,
      timestamp: new Date().toISOString()
    };
  };

  const value = {
    isOnboardingCompleted,
    loading,
    shouldShowOnboarding,
    completeOnboarding,
    resetOnboarding,
    getDebugInfo,
    checkOnboardingStatus,
  };

  useEffect(() => {
    console.log('🔍 OnboardingContext State:', getDebugInfo());
  }, [isOnboardingCompleted, loading]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};