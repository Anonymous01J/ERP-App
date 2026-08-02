import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useAuth } from '../../../src/state/AuthProvider';
import { GlobalHeaderRight } from '../../../src/components/ui/GlobalHeaderRight';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { canAccess } = useAuth();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8);
  const tabBarHeight = 60 + bottomPadding;

  const hiddenStyle = { display: 'none' } as const;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerLeft: () => <DrawerToggleButton tintColor={theme.colors.onPrimary} />,
        headerRight: () => <GlobalHeaderRight tintColor={theme.colors.onPrimary} />,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Materia Prima y Stock',
          tabBarLabel: 'Inventario',
          tabBarStyle: canAccess('inventario') ? { backgroundColor: '#ffffff', height: tabBarHeight, paddingBottom: bottomPadding, paddingTop: 8 } : hiddenStyle,
          tabBarItemStyle: canAccess('inventario') ? undefined : hiddenStyle,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="database" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Gestión de Ventas',
          tabBarLabel: 'Pedidos',
          tabBarItemStyle: canAccess('pedidos') ? undefined : hiddenStyle,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel de Control',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="viajes"
        options={{
          title: 'Logística',
          tabBarLabel: 'Viajes',
          tabBarItemStyle: canAccess('viajes') ? undefined : hiddenStyle,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck-delivery" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finanzas"
        options={{
          title: 'Finanzas',
          tabBarLabel: 'Finanzas',
          tabBarItemStyle: canAccess('finanzas') ? undefined : hiddenStyle,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="finance" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          tabBarLabel: 'Reportes',
          tabBarItemStyle: canAccess('reportes') ? undefined : hiddenStyle,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
