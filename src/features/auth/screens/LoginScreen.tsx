import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { supabase } from '../../../core/supabase/client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNetInfo } from '@react-native-community/netinfo';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  useEffect(() => {
    // Inicializar Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const signInWithEmail = async () => {
    if (!email.trim() || !password) {
      Toast.show({
        type: 'error',
        text1: 'Datos incompletos',
        text2: 'Por favor ingresa tu correo y contraseña.',
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error de acceso',
        text2: error.message === 'Invalid login credentials' 
          ? 'Correo o contraseña incorrectos.' 
          : error.message,
      });
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      
      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) throw error;
      } else {
        throw new Error('No se recibió el token de autenticación de Google.');
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        // Cancelado por el usuario
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error de Autenticación',
          text2: error.message || 'No se pudo iniciar sesión con Google.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingTop: 20, paddingBottom: Math.max(insets.bottom + 20, 30) }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.brandContainer}>
            <Image 
              source={require('../../../../assets/icon.png')} 
              style={styles.appLogo} 
              resizeMode="contain" 
            />
            <Text variant="headlineSmall" style={[styles.brandTitle, { color: theme.colors.primary }]}>
              ERP Rebobinados
            </Text>
            <Text variant="bodyMedium" style={styles.brandSubtitle}>
              Gestión Administrativa e Inventario
            </Text>
          </View>

          {/* Form Card */}
          <Surface style={styles.card} elevation={2}>
            {netInfo.isConnected === false && (
              <View style={{ backgroundColor: theme.colors.errorContainer, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: theme.colors.onErrorContainer, textAlign: 'center', fontWeight: 'bold' }}>
                  Sin conexión a Internet
                </Text>
                <Text style={{ color: theme.colors.onErrorContainer, textAlign: 'center', fontSize: 12 }}>
                  Debes conectarte a una red para iniciar sesión por primera vez.
                </Text>
              </View>
            )}

            <Text variant="titleMedium" style={styles.cardHeader}>
              Iniciar Sesión
            </Text>

            <TextInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              disabled={loading}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              disabled={loading}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off-outline" : "eye-outline"} 
                  onPress={() => setShowPassword(!showPassword)} 
                />
              }
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
            />

            <Button 
              mode="contained" 
              onPress={signInWithEmail} 
              loading={loading}
              disabled={loading}
              style={styles.submitBtn}
              contentStyle={styles.btnContent}
            >
              Ingresar
            </Button>

            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginHorizontal: 12 }}>
                o continúa con
              </Text>
              <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
            </View>

            <Button 
              mode="outlined" 
              icon="google" 
              onPress={signInWithGoogle} 
              loading={loading}
              disabled={loading}
              style={styles.googleBtn}
              contentStyle={styles.btnContent}
            >
              Cuenta de Google
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appLogo: {
    width: 84,
    height: 84,
    marginBottom: 16,
    borderRadius: 20,
  },
  brandTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  cardHeader: {
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  googleBtn: {
    borderRadius: 12,
    borderColor: '#e5e7eb',
  },
  btnContent: {
    paddingVertical: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
});
