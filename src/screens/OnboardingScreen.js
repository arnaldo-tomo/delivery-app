// src/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: { 100: '#FE3801', 80: '#F94234', 50: '#FB7D80', 20: '#FED8CC' },
  secondary: { 100: '#FE8800', 80: '#FEA033', 50: '#FEC380', 20: '#FFEFCC' },
  typography: { 100: '#0B0C17', 80: '#32354E', 50: '#494C61', 20: '#767989' },
  gray: { 100: '#A4A5B0', 80: '#B6B7C0', 50: '#D1D2D7', 20: '#EDEDEF' },
  white: '#FFFFFF',
  background: '#FAFAFA'
};

const onboardingData = [
  {
    id: 1,
    image: require('../../assets/adaptive-icon.png'), // Substitua pela sua imagem
    title: 'Entregas Rápidas',
    subtitle: 'Delivered Fast with Just One Click!',
    description: 'Receba suas encomendas de forma rápida e segura com apenas alguns toques na tela.',
    backgroundColor: colors.primary[100]
  },
  {
    id: 2,
    image: require('../../assets/adaptive-icon.png'), // Substitua pela sua imagem
    title: 'Acompanhamento em Tempo Real',
    subtitle: 'Track Your Orders Anytime!',
    description: 'Monitore suas entregas em tempo real e saiba exatamente onde está seu pedido.',
    backgroundColor: colors.secondary[100]
  },
  {
    id: 3,
    image: require('../../assets/adaptive-icon.png'), // Substitua pela sua imagem
    title: 'Melhor Experiência',
    subtitle: 'Your Ultimate App for Every Delivery!',
    description: 'A melhor plataforma para todas as suas necessidades de entrega. Simples e eficiente.',
    backgroundColor: colors.primary[80]
  }
];

export default function OnboardingScreen({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const goToSlide = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    try {
      // Marcar que o onboarding foi completado
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      // Animação de fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
      onFinish();
    }
  };

  const currentSlide = onboardingData[currentIndex];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar style="light" />
      
      {/* Header com Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {onboardingData.map((item, index) => (
          <View key={item.id} style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
            <View style={styles.slideContent}>
              {/* Imagem */}
              <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.slideImage} />
              </View>

              {/* Conteúdo */}
              <View style={styles.textContainer}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
                <Text style={styles.slideDescription}>{item.description}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Indicadores de página */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          {currentIndex > 0 && (
            <TouchableOpacity 
              onPress={() => goToSlide(currentIndex - 1)} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color={colors.white} />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={handleNext} 
            style={[styles.nextButton, currentIndex === 0 && styles.nextButtonFull]}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? 'Começar' : 'Próximo'}
            </Text>
            <Ionicons 
              name={currentIndex === onboardingData.length - 1 ? "checkmark" : "chevron-forward"} 
              size={24} 
              color={colors.white} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[100],
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  imageContainer: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    resizeMode: 'cover',
  },
  textContainer: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  slideSubtitle: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    fontWeight: '500',
  },
  slideDescription: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    height: 10,
    backgroundColor: colors.white,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: colors.primary[100],
    fontSize: 16,
    fontWeight: '700',
  },
});