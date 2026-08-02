import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { PowerSyncContext } from '@powersync/react';
import { db, setupPowerSync } from '../src/core/powersync/system';
import { AuthProvider, useAuth } from '../src/state/AuthProvider';
import Toast from 'react-native-toast-message';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppLoader } from '../src/components/ui/AppLoader';
import { CuentaInactivaScreen } from '../src/features/auth/screens/CuentaInactivaScreen';
import * as Sentry from '@sentry/react-native';
import { usePushNotifications } from '../src/core/hooks/usePushNotifications';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
]);

// Custom theme for the paper rewinding business
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0D47A1', // Deep Blue for a clean, corporate look
    secondary: '#1976D2',
    tertiary: '#00B0FF',
    error: '#D32F2F',
    background: '#F5F7FA', // Soft gray-blue background for clean UI
    surface: '#FFFFFF',
  },
};

function RootLayoutNav() {
  const { session, isLoading, perfil, isLoadingPerfil } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize push notifications if user is logged in
  usePushNotifications(session?.user?.id);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(drawer)/(tabs)');
    }
  }, [session, isLoading, segments]);

  if (isLoading || (session && isLoadingPerfil)) {
    return <AppLoader />;
  }

  // Usuario autenticado pero cuenta inactiva → pantalla de espera
  if (session && perfil && !perfil.activo) {
    return <CuentaInactivaScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="(screens)/registrar-produccion" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-gasto" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/nuevo-pedido" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-cliente" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/gestionar-presentaciones" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-presentacion" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-pote" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-viaje" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/registrar-proveedor" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/cargar-bobinas-viaje" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/historial-bobinas" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/historial-produccion" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/editar-usuario" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/matriz-permisos" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/notificaciones" options={{ title: 'Notificaciones', headerShown: true, headerStyle: { backgroundColor: '#0D47A1' }, headerTintColor: '#ffffff' }} />
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    // Inicializar PowerSync y conectar con Supabase al iniciar la app
    setupPowerSync().catch(console.error);
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <PaperProvider theme={theme}>
        <AppLoader />
      </PaperProvider>
    );
  }

  return (
    <AuthProvider>
      <PowerSyncContext.Provider value={db}>
        <PaperProvider theme={theme}>
          <RootLayoutNav />
          <Toast />
          <StatusBar style="light" backgroundColor="#0D47A1" />
        </PaperProvider>
      </PowerSyncContext.Provider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);