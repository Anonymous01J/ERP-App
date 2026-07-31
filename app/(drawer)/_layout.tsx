import { Drawer } from 'expo-router/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../../src/state/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function DrawerLayout() {
  const theme = useTheme();
  const router = useRouter();
  const { canAccess, perfil } = useAuth();
  const isAdmin = perfil?.rol === 'admin';

  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.primary} />
      <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        drawerActiveTintColor: theme.colors.primary,
      }}>

      {/* Dashboard — siempre visible */}
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

      {/* Clientes */}
      <Drawer.Screen
        name="clientes"
        options={{
          drawerLabel: 'Directorio de Clientes',
          title: 'Clientes',
          drawerItemStyle: canAccess('clientes') ? undefined : { display: 'none' },
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />

      {/* Proveedores */}
      <Drawer.Screen
        name="proveedores"
        options={{
          drawerLabel: 'Proveedores',
          title: 'Directorio de Proveedores',
          drawerItemStyle: canAccess('proveedores') ? undefined : { display: 'none' },
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="briefcase-account" size={size} color={color} />
          ),
        }}
      />

      {/* Usuarios — solo admin */}
      <Drawer.Screen
        name="usuarios"
        options={{
          drawerLabel: 'Usuarios',
          title: 'Gestión de Usuarios',
          drawerItemStyle: isAdmin ? undefined : { display: 'none' },
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-multiple" size={size} color={color} />
          ),
        }}
      />

      {/* Configuración — solo admin */}
      <Drawer.Screen
        name="configuracion"
        options={{
          drawerLabel: 'Configuración',
          title: 'Configuración',
          drawerItemStyle: isAdmin ? undefined : { display: 'none' },
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />

      {/* Mi Perfil — siempre visible */}
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
    </>
  );
}
