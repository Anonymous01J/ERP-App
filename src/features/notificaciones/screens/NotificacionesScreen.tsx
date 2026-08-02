import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { usePowerSync, useQuery } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';

type Notificacion = {
  id: string;
  titulo: string;
  cuerpo: string;
  data?: string;
  leido: number;
  created_at: string;
};

function getIconForTitle(titulo: string) {
  if (titulo.includes('Bobinas')) return 'package-variant-closed';
  if (titulo.includes('Pedido')) return 'clipboard-text';
  if (titulo.includes('Viaje')) return 'truck-delivery';
  if (titulo.includes('Gasto')) return 'cash';
  if (titulo.includes('Producción')) return 'cog';
  return 'bell-outline';
}

export function NotificacionesScreen() {
  const theme = useTheme();
  const db = usePowerSync();
  const router = useRouter();

  const { data: notificaciones = [], isLoading } = useQuery<Notificacion>(
    'SELECT * FROM notificaciones_historial ORDER BY created_at DESC LIMIT 100'
  );

  const marcarLeida = useCallback(async (id: string) => {
    try {
      await db.execute('UPDATE notificaciones_historial SET leido = 1 WHERE id = ?', [id]);
    } catch (e) {
      console.error('[Notificaciones] Error marcando como leida:', e);
    }
  }, [db]);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await db.execute('UPDATE notificaciones_historial SET leido = 1 WHERE leido = 0');
    } catch (e) {
      console.error('[Notificaciones] Error marcando todas como leidas:', e);
    }
  }, [db]);

  const handlePress = useCallback((item: Notificacion) => {
    const isUnread = item.leido === 0;
    if (isUnread) marcarLeida(item.id);

    if (item.data) {
      try {
        const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
        if (parsedData.ruta) {
          router.push(parsedData.ruta as any);
        }
      } catch (e) {
        console.error('[Notificaciones] Error parseando data:', e);
      }
    }
  }, [marcarLeida, router]);

  const renderItem = useCallback(({ item }: { item: Notificacion }) => {
    const isUnread = item.leido === 0;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
        style={[styles.item, isUnread && { backgroundColor: '#eff6ff' }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: isUnread ? theme.colors.primary : '#e5e7eb' }]}>
          <MaterialCommunityIcons 
            name={getIconForTitle(item.titulo)} 
            size={24} 
            color={isUnread ? '#fff' : '#6b7280'} 
          />
        </View>
        <View style={styles.content}>
          <Text variant="titleMedium" style={{ fontWeight: isUnread ? 'bold' : 'normal', color: '#111827' }}>
            {item.titulo}
          </Text>
          <Text variant="bodyMedium" style={{ color: '#4b5563', marginTop: 4 }}>
            {item.cuerpo}
          </Text>
          <Text variant="bodySmall" style={{ color: '#9ca3af', marginTop: 8 }}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </Text>
        </View>
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    );
  }, [theme.colors.primary, handlePress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Notificaciones</Text>
        <TouchableOpacity onPress={marcarTodasLeidas}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Marcar todas leídas</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : notificaciones.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bell-sleep" size={64} color="#d1d5db" />
          <Text variant="bodyLarge" style={{ color: '#6b7280', marginTop: 16 }}>
            No tienes notificaciones
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
    marginTop: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
