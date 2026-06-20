import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { PowerSyncContext } from '@powersync/react';
import { db, setupPowerSync } from '../src/core/powersync/system';
import { AuthProvider, useAuth } from '../src/state/AuthProvider';
import Toast from 'react-native-toast-message';
import { SyncStatusNotifier } from '../src/components/ui/SyncStatusNotifier';

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
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      // Redirigir al login si no hay sesión y no estamos ya en login
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Redirigir al inicio (tabs dentro de drawer) si hay sesión y estamos intentando ver el login
      router.replace('/(drawer)/(tabs)');
    }
  }, [session, isLoading, segments]);

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
      <Stack.Screen name="(screens)/historial-bobinas" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(screens)/historial-produccion" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
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
    return null;
  }

  return (
    <AuthProvider>
      <PowerSyncContext.Provider value={db}>
        <PaperProvider theme={theme}>
          <RootLayoutNav />
          <SyncStatusNotifier />
          <Toast />
        </PaperProvider>
      </PowerSyncContext.Provider>
    </AuthProvider>
  );
}