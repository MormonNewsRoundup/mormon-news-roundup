import { Alert, Platform } from 'react-native';

/**
 * React Native's Alert is a no-op on web. The iPhone app uses the real alert.
 * The browser preview uses window.alert so share and purchase messages still show.
 */
export function tell(title: string, message?: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
