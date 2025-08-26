// src/context/AuthContext.js - Versão Simplificada e Robusta
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
      console.log('🔄 Inicializando autenticação...');
      
      const token = await ApiService.getToken();
      
      if (token) {
        console.log('✅ Token encontrado, validando...');
        
        try {
          const response = await ApiService.getProfile();
          
          if (response.status === 'success' && response.data) {
            console.log('✅ Login automático bem-sucedido');
            setUser(response.data);
          } else {
            console.log('❌ Token inválido, removendo...');
            await ApiService.removeToken();
          }
        } catch (error) {
          console.log('❌ Erro ao validar token:', error.message);
          await ApiService.removeToken();
        }
      } else {
        console.log('ℹ️ Nenhum token encontrado');
      }
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      await ApiService.removeToken();
    } finally {
      setLoading(false);
      setIsInitialized(true);
      console.log('✅ Autenticação inicializada');
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      setLoading(true);
      console.log('🔐 Fazendo login...');
      
      const response = await ApiService.login(email, password);
      
      if (response.status === 'success' && response.data?.user) {
        console.log('✅ Login realizado com sucesso');
        setUser(response.data.user);
        
        if (!rememberMe) {
          console.log('⚠️ Modo temporário ativado');
          // TODO: Implementar lógica para não persistir o token
        }
        
        return { success: true, user: response.data.user };
      } else {
        console.error('❌ Login falhou');
        return { 
          success: false, 
          error: response.message || 'Erro no login' 
        };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      return { 
        success: false, 
        error: error.message || 'Erro de conexão' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('📝 Registrando usuário...');
      
      const response = await ApiService.register(userData);
      
      if (response.status === 'success' && response.data?.user) {
        console.log('✅ Registro realizado com sucesso');
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        return { 
          success: false, 
          error: response.message || 'Erro no registro' 
        };
      }
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      return { 
        success: false, 
        error: error.message || 'Erro de conexão' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      await ApiService.logout();
      setUser(null);
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro, limpar estado local
      setUser(null);
      return { success: false, error: error.message };
    }
  };

  const updateUser = (updatedData) => {
    console.log('🔄 Atualizando dados do usuário');
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Atualizando perfil...');
      const response = await ApiService.getProfile();
      
      if (response.status === 'success' && response.data) {
        setUser(response.data);
        return { success: true, user: response.data };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      
      if (error.message.includes('Sessão expirada')) {
        setUser(null);
      }
      
      return { success: false, error: error.message };
    }
  };

  // 🔍 DEBUG: Método para verificar estado atual
  const getDebugInfo = () => {
    return {
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
      loading,
      isInitialized,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    };
  };

  const value = {
    // Estado
    user,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    
    // Métodos principais
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    
    // Utilitários
    getDebugInfo,
    initializeAuth,
  };

  // 🔍 DEBUG: Log do estado sempre que mudar
  useEffect(() => {
    console.log('🔍 AuthContext State:', getDebugInfo());
  }, [user, loading, isInitialized]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};