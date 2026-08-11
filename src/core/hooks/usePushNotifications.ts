import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../supabase/client';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { usePowerSync } from '@powersync/react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(userId?: string | null) {
  const powerSync = usePowerSync();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  // Guard to avoid multiple registration attempts
  const isRegistering = useRef(false);

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    // Don't register if not on a real device
    if (!Device.isDevice) {
      console.log('[usePushNotifications] Must use physical device for Push Notifications');
      return undefined;
    }

    // Prevent concurrent calls
    if (isRegistering.current) return undefined;
    isRegistering.current = true;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[usePushNotifications] Permission not granted for push notifications.');
        return undefined;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('[usePushNotifications] EAS projectId not found in app config.');
        return undefined;
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('[usePushNotifications] Expo Push Token:', pushToken.data);
      return pushToken.data;
    } catch (e: unknown) {
      // Catch ANY native or JS exception to prevent crash
      console.error('[usePushNotifications] Error getting push token (non-fatal):', e);
      Sentry.captureException(e, { tags: { section: 'push-registration' } });
      return undefined;
    } finally {
      isRegistering.current = false;
    }
  }

  useEffect(() => {
    // Only attempt registration if userId is available (user is authenticated)
    if (!userId) return;

    let isMounted = true;

    // Wrap in an outer catch to guarantee no crash bubbles up
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token && isMounted) {
          setExpoPushToken(token);
          saveTokenToSupabase(userId, token);
        }
      })
      .catch((err) => {
        // Absolute safety net - should never reach here due to internal try/catch
        console.error('[usePushNotifications] Unexpected error in registration:', err);
        Sentry.captureException(err, { tags: { section: 'push-unexpected' } });
      });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (isMounted) setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('[usePushNotifications] User interacted with notification:', response);
        const content = response.notification.request.content;
        const data = content.data;
        const title = content.title;
        
        try {
          if (title) {
            await powerSync.execute('UPDATE notificaciones_historial SET leido = 1 WHERE titulo = ? AND leido = 0', [title]);
          } else {
            await powerSync.execute('UPDATE notificaciones_historial SET leido = 1 WHERE leido = 0');
          }
        } catch (e) {
          console.error('[usePushNotifications] Error marking as read:', e);
        }

        if (data && data.ruta) {
          try {
            router.push(data.ruta as any);
          } catch (e) {
            console.error('[usePushNotifications] Navigation error:', e);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]); // Only runs when userId changes (i.e. user logs in/out)

  const saveTokenToSupabase = async (uid: string, token: string) => {
    try {
      const { error } = await supabase.from('push_tokens').upsert(
        { user_id: uid, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
      if (error) {
        console.error('[usePushNotifications] Error saving token to Supabase:', error);
        Sentry.captureException(error, { tags: { section: 'push-save-supabase' } });
      } else {
        console.log('[usePushNotifications] Token saved to Supabase for user', uid);
      }
    } catch (err) {
      console.error('[usePushNotifications] Exception saving token (non-fatal):', err);
      Sentry.captureException(err, { tags: { section: 'push-save-supabase-exception' } });
    }
  };

  return {
    expoPushToken,
    notification,
  };
}
