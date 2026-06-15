import { Drawer } from 'expo-router/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        drawerActiveTintColor: theme.colors.primary,
      }}>
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          drawerLabel: 'Inicio',
          title: 'Panel de Control',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="proveedores"
        options={{
          drawerLabel: 'Proveedores',
          title: 'Directorio de Proveedores',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="briefcase-account" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="usuarios"
        options={{
          drawerLabel: 'Usuarios',
          title: 'Gestión de Usuarios',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-multiple" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="perfil"
        options={{
          drawerLabel: 'Mi Perfil',
          title: 'Mi Perfil',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
