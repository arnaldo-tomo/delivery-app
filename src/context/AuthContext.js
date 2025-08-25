// src/context/AuthContext.js - Versão Corrigida
import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/ApiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Verificar se existe token salvo
      const token = await ApiService.getToken();
      
      if (token) {
        console.log('Token encontrado, fazendo login automático...');
        
        try {
          // Tentar validar o token com a API
          const response = await ApiService.getProfile();
          
          if (response.status === 'success') {
            console.log('Login automático bem-sucedido:', response.data);
            setUser(response.data);
          } else {
            console.log('Token inválido, removendo...');
            await ApiService.removeToken();
          }
        } catch (error) {
          console.log('Erro ao validar token:', error.message);
          // Token expirado ou inválido, remover
          await ApiService.removeToken();
        }
      } else {
        console.log('Nenhum token encontrado - primeira vez');
      }
    } catch (error) {
      console.error('Erro na inicialização da autenticação:', error);
      await ApiService.removeToken();
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      setLoading(true);
      const response = await ApiService.login(email, password);
      
      if (response.status === 'success') {
        console.log('Login realizado com sucesso');
        // Usar o usuário retornado no login
        setUser(response.data.user);
        
        if (!rememberMe) {
          console.log('Login temporário - token será removido ao fechar o app');
        }
        
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log('Fazendo logout...');
      
      // Tentar fazer logout na API
      try {
        await ApiService.logout();
      } catch (error) {
        console.log('Erro ao fazer logout na API:', error.message);
        // Continuar com logout local mesmo se API falhar
      }
      
      // Limpar dados locais
      await ApiService.removeToken();
      setUser(null);
      
      console.log('Logout concluído');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar logout local
      await ApiService.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await ApiService.getProfile();
      if (response.status === 'success') {
        setUser(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    login,
    logout,
    refreshProfile,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    isDeliveryPerson: user?.role === 'delivery_person'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};