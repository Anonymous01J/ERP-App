import { Drawer } from 'expo-router/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: '#555',
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Operaciones',
          title: 'Sistema ERP',
          drawerIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} />,
          headerShown: false, // Ocultar el header del drawer porque los tabs ya tienen su propio header
        }}
      />
      <Drawer.Screen
        name="clientes"
        options={{
          drawerLabel: 'Clientes',
          title: 'Directorio de Clientes',
          drawerIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="proveedores"
        options={{
          drawerLabel: 'Proveedores',
          title: 'Catálogo de Proveedores',
          drawerIcon: ({ color, size }) => <MaterialCommunityIcons name="domain" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="usuarios"
        options={{
          drawerLabel: 'Usuarios',
          title: 'Gestión de Usuarios',
          drawerIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-account" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="perfil"
        options={{
          drawerLabel: 'Mi Perfil',
          title: 'Perfil de Usuario',
          drawerIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle" size={size} color={color} />,
        }}
      />
    </Drawer>
  );
}
