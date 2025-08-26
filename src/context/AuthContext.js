// src/context/AuthContext.js - Versão corrigida com debug
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
    console.log('🚀 AuthProvider inicializando...');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      console.log('🔍 Verificando autenticação existente...');
      
      // Verificar se existe token salvo
      const token = await ApiService.getToken();
      
      if (token) {
        console.log('🔑 Token encontrado, validando com servidor...');
        
        try {
          // Tentar validar o token com a API
          const response = await ApiService.getProfile();
          
          if (response.status === 'success') {
            console.log('✅ Token válido, usuário logado:', response.data);
            setUser(response.data);
          } else {
            console.log('❌ Token inválido, removendo...');
            await ApiService.removeToken();
            setUser(null);
          }
        } catch (error) {
          console.log('❌ Erro ao validar token:', error.message);
          
          // Se erro 401, token expirado
          if (error.message.includes('expirou') || error.message.includes('Unauthenticated')) {
            console.log('⏰ Token expirado, fazendo logout...');
            await ApiService.removeToken();
            setUser(null);
          } else {
            console.log('🌐 Erro de rede, mantendo token para tentar depois');
            // Em caso de erro de rede, não remover o token
          }
        }
      } else {
        console.log('ℹ️ Nenhum token encontrado - usuário não logado');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erro crítico na inicialização:', error);
      // Em caso de erro crítico, limpar tudo
      await ApiService.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
      setIsInitialized(true);
      console.log('✅ Inicialização da autenticação concluída');
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      setLoading(true);
      console.log('🔐 Tentando fazer login para:', email);
      
      const response = await ApiService.login(email, password);
      
      if (response.status === 'success') {
        console.log('✅ Login bem-sucedido');
        
        // Extrair dados do usuário da resposta
        let userData = null;
        
        if (response.data) {
          userData = response.data.user || response.data;
        }
        
        if (userData) {
          setUser(userData);
          console.log('👤 Usuário definido:', userData.name, '- Papel:', userData.role);
          
          return { success: true, data: userData };
        } else {
          console.error('❌ Dados do usuário não encontrados na resposta');
          return { success: false, error: 'Dados do usuário não recebidos' };
        }
      } else {
        console.log('❌ Login falhou:', response.message);
        return { success: false, error: response.message || 'Erro no login' };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, error: error.message || 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log('🚪 Iniciando logout...');
      
      // Fazer logout na API
      try {
        await ApiService.logout();
        console.log('✅ Logout no servidor concluído');
      } catch (error) {
        console.log('⚠️ Erro no logout do servidor:', error.message);
        // Continuar com logout local mesmo se servidor falhar
      }
      
      // Limpar estado local
      setUser(null);
      console.log('✅ Logout local concluído');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar logout local em caso de erro
      try {
        await ApiService.removeToken();
        setUser(null);
        console.log('✅ Logout forçado realizado');
        return { success: true };
      } catch (forceError) {
        console.error('❌ Falha no logout forçado:', forceError);
        return { success: false, error: 'Erro ao fazer logout' };
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      console.log('🔄 Atualizando perfil do usuário...');
      const response = await ApiService.getProfile();
      
      if (response.status === 'success') {
        setUser(response.data);
        console.log('✅ Perfil atualizado:', response.data.name);
        return { success: true, data: response.data };
      } else {
        console.log('❌ Erro ao atualizar perfil:', response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      
      // Se erro 401, fazer logout automático
      if (error.message.includes('expirou') || error.message.includes('Unauthenticated')) {
        console.log('⏰ Sessão expirou durante atualização do perfil');
        await logout();
      }
      
      return { success: false, error: error.message };
    }
  };

  // =============== FUNÇÕES DE DEBUG ===============
  
  const debugAuth = async () => {
    console.log('🔍 === DEBUG AUTH ===');
    console.log('Estado atual:');
    console.log('  user:', user?.name || 'null');
    console.log('  role:', user?.role || 'null');
    console.log('  loading:', loading);
    console.log('  isInitialized:', isInitialized);
    console.log('  isAuthenticated:', !!user);
    
    await ApiService.debugAuth();
    console.log('🔍 === FIM DEBUG ===');
  };

  const forceLogout = async () => {
    console.log('🔧 === LOGOUT FORÇADO ===');
    await ApiService.clearAllData();
    setUser(null);
    setLoading(false);
    console.log('✅ Logout forçado concluído');
  };

  // Verificar se é entregador
  const isDeliveryPerson = user?.role === 'delivery_person';
  const isAuthenticated = !!user;

  // Log de mudanças no estado do usuário
  useEffect(() => {
    if (user) {
      console.log('👤 Usuário autenticado:', user.name, '(', user.role, ')');
    } else if (isInitialized) {
      console.log('👤 Usuário não autenticado');
    }
  }, [user, isInitialized]);

  const value = {
    // Estados
    user,
    loading,
    isInitialized,
    isAuthenticated,
    isDeliveryPerson,
    
    // Funções
    login,
    logout,
    refreshProfile,
    
    // Debug (remover em produção)
    debugAuth,
    forceLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};