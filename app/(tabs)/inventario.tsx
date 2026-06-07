// app/(tabs)/index.tsx
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">¡Estructura Lista!</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Las rutas están controladas por Expo Router y React Native Paper.
      </Text>
      <Button mode="contained" onPress={() => console.log('¡Hola!')}>
        Acción Rápida
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  subtitle: {
    textAlign: 'center',
    marginVertical: 12,
    color: '#666',
  },
});