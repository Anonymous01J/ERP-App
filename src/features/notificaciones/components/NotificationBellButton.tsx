import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import { useNotificacionesNoLeidas } from '@features/notificaciones/hooks/useNotificacionesNoLeidas';

interface NotificationBellButtonProps {
  tintColor?: string;
}

export function NotificationBellButton({ tintColor = '#ffffff' }: NotificationBellButtonProps) {
  const router = useRouter();
  const noLeidas = useNotificacionesNoLeidas();

  return (
    <TouchableOpacity
      onPress={() => router.push('/(screens)/notificaciones')}
      style={styles.container}
      accessibilityLabel="Ver notificaciones"
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={noLeidas > 0 ? 'bell-badge-outline' : 'bell-outline'}
        size={24}
        color={tintColor}
      />
      {noLeidas > 0 && (
        <Badge style={styles.badge} size={16}>
          {noLeidas > 99 ? '99+' : noLeidas}
        </Badge>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 9,
  },
});
