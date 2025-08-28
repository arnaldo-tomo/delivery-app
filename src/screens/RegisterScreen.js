// src/screens/RegisterScreen.js - Registro Completo de Entregador
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated
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

export default function RegisterScreen({ navigation }) {
  // Estados do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dados pessoais
  const [personalData, setPersonalData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    password: '',
    confirmPassword: ''
  });

  // Dados do veículo
  const [vehicleData, setVehicleData] = useState({
    vehicleType: '', // moto, bicicleta, carro, a-pe
    licensePlate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    hasInsurance: false,
    insuranceNumber: ''
  });

  // Documentação
  const [documentsData, setDocumentsData] = useState({
    hasDriverLicense: false,
    licenseNumber: '',
    licenseCategory: '',
    hasWorkCard: false,
    workCardNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    acceptTerms: false
  });

  // Erros de validação
  const [errors, setErrors] = useState({});
  
  // Animações
  const progressAnimation = useRef(new Animated.Value(33.33)).current;
  const stepAnimation = useRef(new Animated.Value(1)).current;

  const { register } = useAuth();

  // Opções de veículos
  const vehicleTypes = [
    { id: 'moto', name: 'Moto', icon: 'bicycle-outline', requiresLicense: true },
    { id: 'bicicleta', name: 'Bicicleta', icon: 'bicycle-outline', requiresLicense: false },
    { id: 'carro', name: 'Carro', icon: 'car-outline', requiresLicense: true },
    { id: 'a-pe', name: 'A pé', icon: 'walk-outline', requiresLicense: false }
  ];

  // Validações
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateCPF = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  };

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!personalData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    }
    
    if (!personalData.email || !validateEmail(personalData.email)) {
      newErrors.email = 'Email válido é obrigatório';
    }
    
    if (!personalData.phone || !validatePhone(personalData.phone)) {
      newErrors.phone = 'Telefone válido é obrigatório';
    }
    
    if (!personalData.cpf || !validateCPF(personalData.cpf)) {
      newErrors.cpf = 'CPF válido é obrigatório';
    }
    
    if (!personalData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    }
    
    if (!personalData.password || personalData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (personalData.password !== personalData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!vehicleData.vehicleType) {
      newErrors.vehicleType = 'Selecione o tipo de veículo';
    }

    const selectedVehicle = vehicleTypes.find(v => v.id === vehicleData.vehicleType);
    
    if (selectedVehicle && ['moto', 'carro'].includes(selectedVehicle.id)) {
      if (!vehicleData.licensePlate) {
        newErrors.licensePlate = 'Placa é obrigatória';
      }
      if (!vehicleData.brand) {
        newErrors.brand = 'Marca é obrigatória';
      }
      if (!vehicleData.model) {
        newErrors.model = 'Modelo é obrigatório';
      }
      if (!vehicleData.year) {
        newErrors.year = 'Ano é obrigatório';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const selectedVehicle = vehicleTypes.find(v => v.id === vehicleData.vehicleType);
    
    if (selectedVehicle?.requiresLicense && !documentsData.hasDriverLicense) {
      newErrors.hasDriverLicense = 'CNH é obrigatória para este tipo de veículo';
    }
    
    if (documentsData.hasDriverLicense && !documentsData.licenseNumber) {
      newErrors.licenseNumber = 'Número da CNH é obrigatório';
    }
    
    if (!documentsData.emergencyContactName) {
      newErrors.emergencyContactName = 'Nome do contato de emergência é obrigatório';
    }
    
    if (!documentsData.emergencyContactPhone) {
      newErrors.emergencyContactPhone = 'Telefone de emergência é obrigatório';
    }
    
    if (!documentsData.acceptTerms) {
      newErrors.acceptTerms = 'Você deve aceitar os termos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      default:
        isValid = true;
    }

    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      
      // Animar progresso
      Animated.timing(progressAnimation, {
        toValue: (currentStep + 1) * 33.33,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Animar step
      Animated.sequence([
        Animated.timing(stepAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      
      Animated.timing(progressAnimation, {
        toValue: (currentStep - 1) * 33.33,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleRegister = async () => {
    if (!validateStep3()) {
      return;
    }

    setLoading(true);
    
    const userData = {
      ...personalData,
      ...vehicleData,
      ...documentsData,
      userType: 'delivery'
    };

    try {
      const result = await register(userData);
      
      if (result.success) {
        Alert.alert(
          'Sucesso!',
          'Cadastro realizado com sucesso. Bem-vindo ao Meu24!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Renderizar steps
  const renderStep1 = () => (
    <Animated.View style={[styles.stepContainer, { opacity: stepAnimation }]}>
      <Text style={styles.stepTitle}>Dados Pessoais</Text>
      <Text style={styles.stepSubtitle}>Vamos começar com suas informações básicas</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Senha *</Text>
        <View style={[styles.inputContainer, errors.password && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.gray[100]} />
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            value={personalData.password}
            onChangeText={(text) => setPersonalData({...personalData, password: text})}
            secureTextEntry
          />
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirmar Senha *</Text>
        <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.gray[100]} />
          <TextInput
            style={styles.input}
            placeholder="Digite a senha novamente"
            value={personalData.confirmPassword}
            onChangeText={(text) => setPersonalData({...personalData, confirmPassword: text})}
            secureTextEntry
          />
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContainer, { opacity: stepAnimation }]}>
      <Text style={styles.stepTitle}>Informações do Veículo</Text>
      <Text style={styles.stepSubtitle}>Como você fará as entregas?</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tipo de Veículo *</Text>
        <View style={styles.vehicleTypeContainer}>
          {vehicleTypes.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleTypeButton,
                vehicleData.vehicleType === vehicle.id && styles.vehicleTypeActive,
                errors.vehicleType && !vehicleData.vehicleType && styles.vehicleTypeError
              ]}
              onPress={() => setVehicleData({...vehicleData, vehicleType: vehicle.id})}
            >
              <Ionicons 
                name={vehicle.icon} 
                size={24} 
                color={vehicleData.vehicleType === vehicle.id ? colors.white : colors.gray[100]} 
              />
              <Text style={[
                styles.vehicleTypeText,
                vehicleData.vehicleType === vehicle.id && styles.vehicleTypeActiveText
              ]}>
                {vehicle.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.vehicleType && <Text style={styles.errorText}>{errors.vehicleType}</Text>}
      </View>

      {['moto', 'carro'].includes(vehicleData.vehicleType) && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Placa do Veículo *</Text>
            <View style={[styles.inputContainer, errors.licensePlate && styles.inputError]}>
              <Ionicons name="car-outline" size={20} color={colors.gray[100]} />
              <TextInput
                style={styles.input}
                placeholder="ABC-1234"
                value={vehicleData.licensePlate}
                onChangeText={(text) => setVehicleData({...vehicleData, licensePlate: text.toUpperCase()})}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
            {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Marca *</Text>
              <View style={[styles.inputContainer, errors.brand && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Honda"
                  value={vehicleData.brand}
                  onChangeText={(text) => setVehicleData({...vehicleData, brand: text})}
                />
              </View>
              {errors.brand && <Text style={styles.errorText}>{errors.brand}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Modelo *</Text>
              <View style={[styles.inputContainer, errors.model && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="CG 160"
                  value={vehicleData.model}
                  onChangeText={(text) => setVehicleData({...vehicleData, model: text})}
                />
              </View>
              {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Ano *</Text>
              <View style={[styles.inputContainer, errors.year && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="2020"
                  value={vehicleData.year}
                  onChangeText={(text) => setVehicleData({...vehicleData, year: text})}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Vermelha"
                  value={vehicleData.color}
                  onChangeText={(text) => setVehicleData({...vehicleData, color: text})}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setVehicleData({...vehicleData, hasInsurance: !vehicleData.hasInsurance})}
          >
            <View style={[styles.checkbox, vehicleData.hasInsurance && styles.checkboxActive]}>
              {vehicleData.hasInsurance && (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              )}
            </View>
            <Text style={styles.checkboxText}>Possui seguro do veículo</Text>
          </TouchableOpacity>

          {vehicleData.hasInsurance && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Número da Apólice</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-outline" size={20} color={colors.gray[100]} />
                <TextInput
                  style={styles.input}
                  placeholder="Número da apólice"
                  value={vehicleData.insuranceNumber}
                  onChangeText={(text) => setVehicleData({...vehicleData, insuranceNumber: text})}
                />
              </View>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );

  const renderStep3 = () => {
    const selectedVehicle = vehicleTypes.find(v => v.id === vehicleData.vehicleType);
    
    return (
      <Animated.View style={[styles.stepContainer, { opacity: stepAnimation }]}>
        <Text style={styles.stepTitle}>Documentação</Text>
        <Text style={styles.stepSubtitle}>Finalize seu cadastro com os documentos</Text>
        
        {selectedVehicle?.requiresLicense && (
          <>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDocumentsData({...documentsData, hasDriverLicense: !documentsData.hasDriverLicense})}
            >
              <View style={[
                styles.checkbox, 
                documentsData.hasDriverLicense && styles.checkboxActive,
                errors.hasDriverLicense && styles.checkboxError
              ]}>
                {documentsData.hasDriverLicense && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxText}>Possuo CNH válida *</Text>
            </TouchableOpacity>
            {errors.hasDriverLicense && <Text style={styles.errorText}>{errors.hasDriverLicense}</Text>}

            {documentsData.hasDriverLicense && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Número da CNH *</Text>
                  <View style={[styles.inputContainer, errors.licenseNumber && styles.inputError]}>
                    <Ionicons name="card-outline" size={20} color={colors.gray[100]} />
                    <TextInput
                      style={styles.input}
                      placeholder="00000000000"
                      value={documentsData.licenseNumber}
                      onChangeText={(text) => setDocumentsData({...documentsData, licenseNumber: text})}
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Categoria</Text>
                  <View style={styles.categoryContainer}>
                    {['A', 'B', 'C', 'D', 'E'].map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryButton,
                          documentsData.licenseCategory === category && styles.categoryActive
                        ]}
                        onPress={() => setDocumentsData({...documentsData, licenseCategory: category})}
                      >
                        <Text style={[
                          styles.categoryText,
                          documentsData.licenseCategory === category && styles.categoryActiveText
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setDocumentsData({...documentsData, hasWorkCard: !documentsData.hasWorkCard})}
        >
          <View style={[styles.checkbox, documentsData.hasWorkCard && styles.checkboxActive]}>
            {documentsData.hasWorkCard && (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            )}
          </View>
          <Text style={styles.checkboxText}>Possuo Carteira de Trabalho</Text>
        </TouchableOpacity>

        {documentsData.hasWorkCard && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número da CTPS</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="document-outline" size={20} color={colors.gray[100]} />
              <TextInput
                style={styles.input}
                placeholder="Número da carteira"
                value={documentsData.workCardNumber}
                onChangeText={(text) => setDocumentsData({...documentsData, workCardNumber: text})}
              />
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Contato de Emergência</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nome do Contato *</Text>
          <View style={[styles.inputContainer, errors.emergencyContactName && styles.inputError]}>
            <Ionicons name="person-outline" size={20} color={colors.gray[100]} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              value={documentsData.emergencyContactName}
              onChangeText={(text) => setDocumentsData({...documentsData, emergencyContactName: text})}
            />
          </View>
          {errors.emergencyContactName && <Text style={styles.errorText}>{errors.emergencyContactName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Telefone de Emergência *</Text>
          <View style={[styles.inputContainer, errors.emergencyContactPhone && styles.inputError]}>
            <Ionicons name="call-outline" size={20} color={colors.gray[100]} />
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              value={documentsData.emergencyContactPhone}
              onChangeText={(text) => setDocumentsData({...documentsData, emergencyContactPhone: formatPhone(text)})}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
          {errors.emergencyContactPhone && <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text>}
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setDocumentsData({...documentsData, acceptTerms: !documentsData.acceptTerms})}
        >
          <View style={[
            styles.checkbox, 
            documentsData.acceptTerms && styles.checkboxActive,
            errors.acceptTerms && styles.checkboxError
          ]}>
            {documentsData.acceptTerms && (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            )}
          </View>
          <Text style={styles.checkboxText}>
            Aceito os{' '}
            <Text style={styles.linkText}>Termos de Uso</Text>{' '}
            e{' '}
            <Text style={styles.linkText}>Política de Privacidade</Text> *
          </Text>
        </TouchableOpacity>
        {errors.acceptTerms && <Text style={styles.errorText}>{errors.acceptTerms}</Text>}
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => currentStep === 1 ? navigation.goBack() : prevStep()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.typography[100]} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cadastro de Entregador</Text>
          <Text style={styles.headerSubtitle}>Passo {currentStep} de 3</Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                })
              }
            ]} 
          />
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep < 3 ? (
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={nextStep}
          >
            <Text style={styles.nextButtonText}>Próximo</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="reload-outline" size={20} color={colors.white} />
                <Text style={styles.registerButtonText}>Cadastrando...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                <Text style={styles.registerButtonText}>Finalizar Cadastro</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.typography[100],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.typography[50],
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[20],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[100],
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.typography[100],
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.typography[50],
    marginBottom: 32,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.typography[100],
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[80],
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.gray[20],
    gap: 12,
  },
  inputError: {
    borderColor: colors.primary[100],
    backgroundColor: colors.primary[20] + '10',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.typography[100],
  },
  errorText: {
    fontSize: 12,
    color: colors.primary[100],
    marginTop: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vehicleTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray[20],
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  vehicleTypeActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[100],
  },
  vehicleTypeError: {
    borderColor: colors.primary[100],
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.typography[80],
    textAlign: 'center',
  },
  vehicleTypeActiveText: {
    color: colors.white,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[100],
  },
  checkboxError: {
    borderColor: colors.primary[100],
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: colors.typography[50],
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray[20],
    backgroundColor: colors.white,
  },
  categoryActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[100],
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.typography[80],
  },
  categoryActiveText: {
    color: colors.white,
  },
  linkText: {
    color: colors.primary[100],
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[20],
  },
  nextButton: {
    backgroundColor: colors.primary[100],
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: colors.primary[100],
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray[50],
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})