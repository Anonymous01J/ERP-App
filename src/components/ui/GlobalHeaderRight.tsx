import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SyncStatusNotifier } from './SyncStatusNotifier';
import { NotificationBellButton } from '../../features/notificaciones/components/NotificationBellButton';

export function GlobalHeaderRight({ tintColor = '#ffffff' }: { tintColor?: string }) {
  return (
    <View style={styles.container}>
      <SyncStatusNotifier />
      <NotificationBellButton tintColor={tintColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
