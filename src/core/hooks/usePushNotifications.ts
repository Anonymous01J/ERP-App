import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(userId?: string | null) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (!projectId) {
        console.warn('EAS projectId not found. If this is a bare workflow, token generation might fail.');
      }

      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log('[usePushNotifications] Expo Push Token:', pushTokenString);
        return pushTokenString;
      } catch (e: unknown) {
        console.error('[usePushNotifications] Error getting token:', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Register token and save to Supabase
    registerForPushNotificationsAsync().then((token) => {
      if (token && isMounted) {
        setExpoPushToken(token);
        
        // Save to Supabase if userId is provided
        if (userId) {
          saveTokenToSupabase(userId, token);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('User interacted with notification:', response);
      // Here you could handle deep linking or navigation based on response.notification.request.content.data
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId]);

  const saveTokenToSupabase = async (uid: string, token: string) => {
    try {
      const { error } = await supabase.from('push_tokens').upsert(
        { user_id: uid, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
      if (error) {
        console.error('[usePushNotifications] Error saving token to Supabase:', error);
      } else {
        console.log('[usePushNotifications] Token successfully saved to Supabase for user', uid);
      }
    } catch (err) {
      console.error('[usePushNotifications] Exception saving token:', err);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}
