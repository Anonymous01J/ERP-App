import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { usePowerSync, useQuery } from '@powersync/react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';

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

  const { data: notificaciones = [], isLoading } = useQuery<Notificacion>(
    'SELECT * FROM notificaciones_historial ORDER BY created_at DESC LIMIT 100'
  );

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [redirectingId, setRedirectingId] = React.useState<string | null>(null);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert('Eliminar Notificaciones', '¿Deseas eliminar las notificaciones seleccionadas?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: async () => {
          try {
            const ids = Array.from(selectedIds).map(id => `'${id}'`).join(',');
            await db.execute(`DELETE FROM notificaciones_historial WHERE id IN (${ids})`);
            setSelectedIds(new Set());
          } catch (e) {
            console.error('[Notificaciones] Error eliminando notificaciones:', e);
          }
        }
      }
    ]);
  }, [selectedIds, db]);

  const marcarLeida = useCallback(async (id: string) => {
    try {
      await db.execute('UPDATE notificaciones_historial SET leido = 1 WHERE id = ?', [id]);
    } catch (e) {
      console.error('[Notificaciones] Error marcando como leida:', e);
    }
  }, [db]);

  const marcarSeleccionadasOLeidas = useCallback(async () => {
    try {
      if (selectedIds.size > 0) {
        const ids = Array.from(selectedIds).map(id => `'${id}'`).join(',');
        await db.execute(`UPDATE notificaciones_historial SET leido = 1 WHERE id IN (${ids}) AND leido = 0`);
        setSelectedIds(new Set());
      } else {
        await db.execute('UPDATE notificaciones_historial SET leido = 1 WHERE leido = 0');
      }
    } catch (e) {
      console.error('[Notificaciones] Error marcando como leidas:', e);
    }
  }, [db, selectedIds]);

  const handlePress = useCallback((item: Notificacion) => {
    if (selectedIds.size > 0) {
      toggleSelection(item.id);
      return;
    }

    const isUnread = item.leido === 0 || (item.leido as any) === false;
    if (isUnread) marcarLeida(item.id);

    setRedirectingId(item.id);

    // Permite que React renderice el loader antes de trancar el hilo principal con la navegación
    setTimeout(() => {
      console.log('[Notificaciones] handlePress -> item.data RAW:', JSON.stringify(item.data));
      if (item.data) {
        try {
          let parsedData = item.data;
          if (typeof parsedData === 'string') {
            parsedData = JSON.parse(parsedData);
            if (typeof parsedData === 'string') {
              parsedData = JSON.parse(parsedData);
            }
          }
          console.log('[Notificaciones] parsedData:', JSON.stringify(parsedData));
          if (parsedData?.ruta) {
            let ruta: string = parsedData.ruta;
            if (ruta.endsWith(')')) {
              ruta = ruta + '/';
            }
            console.log('[Notificaciones] Navegando a:', ruta);
            router.navigate(ruta as any);
          } else {
            console.warn('[Notificaciones] No se encontró campo "ruta" en data');
          }
        } catch (e) {
          console.error('[Notificaciones] Error parseando data:', e, 'data raw:', item.data);
        }
      } else {
        console.warn('[Notificaciones] item.data está vacío o nulo');
      }
      
      // Limpiar el loader un poco después de que inicie la transición
      setTimeout(() => setRedirectingId(null), 500);
    }, 50);
  }, [marcarLeida, selectedIds.size, toggleSelection]);

  const renderItem = useCallback(({ item }: { item: Notificacion }) => {
    const isUnread = item.leido === 0 || (item.leido as any) === false;
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
        onLongPress={() => toggleSelection(item.id)}
        style={[
          styles.item, 
          isUnread && { backgroundColor: '#eff6ff' },
          isSelected && { backgroundColor: '#e0e7ff', borderColor: theme.colors.primary, borderWidth: 1 }
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: isUnread ? theme.colors.primary : '#e5e7eb' }]}>
          <MaterialCommunityIcons 
            name={isSelected ? "check-circle" : getIconForTitle(item.titulo)} 
            size={24} 
            color={isUnread || isSelected ? '#fff' : '#6b7280'} 
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
        {isUnread && !isSelected && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    );
  }, [theme.colors.primary, handlePress, selectedIds, toggleSelection]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
          {selectedIds.size > 0 ? `${selectedIds.size} seleccionadas` : 'Notificaciones'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {selectedIds.size > 0 ? (
            <TouchableOpacity onPress={deleteSelected} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={marcarSeleccionadasOLeidas}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {selectedIds.size > 0 ? 'Marcar seleccionadas leídas' : 'Marcar todas leídas'}
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* Overlay de carga que bloquea toda la pantalla durante la redirección */}
      {redirectingId && (
        <View style={[StyleSheet.absoluteFill, styles.overlayLoader]}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="labelLarge" style={{ marginTop: 12, color: theme.colors.primary, fontWeight: 'bold' }}>
              Redirigiendo...
            </Text>
          </View>
        </View>
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
  overlayLoader: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 10,
  },
  loaderBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  }
});
