import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initializes Android Notification Channels (required for Android 8.0+ / API 26 through Android 14).
 * Without this, Android silences or hides incoming notifications.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. High-priority channel for incoming mechanic dispatches (audible heads-up alert)
    await Notifications.setNotificationChannelAsync('urgent_dispatch', {
      name: 'Urgent Breakdown Dispatches',
      description: 'Instant alerts when a nearby farmer requests tractor emergency repair',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#006376',
      enableLights: true,
      enableVibrate: true,
      sound: 'default',
    });

    // 2. Default channel for general repair lifecycle updates (quotes, arrivals, receipts)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Job Updates & Receipts',
      description: 'Notifications regarding repair quotes, status updates, and digital receipts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
      lightColor: '#006376',
      sound: 'default',
    });
  } catch {
    // Fail safe: non-blocking
  }
}
