import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export function AppLoader() {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animación de aparición suave (Fade In + Slide Up)
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de latido (Pulse) continua en el logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          {/* Logo animado */}
          <Animated.Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
          ERP Rebobinados
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Cargando sistema de gestión...
        </Text>

        {/* Loader de 3 puntitos estilo pulse o spinner circular minimalista */}
        <View style={styles.loaderContainer}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.8 }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.5 }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.2 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: width * 0.8,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  title: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 40,
  },
  loaderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
