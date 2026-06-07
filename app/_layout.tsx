import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error(fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="(screens)/registrar-produccion" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/registrar-gasto" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/nuevo-pedido" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/registrar-cliente" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/gestionar-presentaciones" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/registrar-viaje" 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="(screens)/historial-bobinas" 
          options={{ presentation: 'fullScreenModal' }} 
        />
      </Stack>
    </PaperProvider>
  );
}
