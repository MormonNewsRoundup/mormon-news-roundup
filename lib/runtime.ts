import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { ADS_ENABLED, IAP_ENABLED } from '@/constants/config';

/** True when the JS is running inside the Expo Go app, not a store build. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * AdMob and StoreKit are native modules. They are not in Expo Go or the web
 * preview, and importing them there crashes the app. Call this before require().
 */
export function canUseNativeAds(): boolean {
  return ADS_ENABLED && Platform.OS !== 'web' && !isExpoGo();
}

export function canUseIap(): boolean {
  return IAP_ENABLED && (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo();
}

/** The pretend “ads removed” switch is only for previews and dev builds. */
export function showPreviewTools(): boolean {
  return __DEV__ || isExpoGo() || Platform.OS === 'web';
}

export function previewRuntimeLabel(): string {
  if (Platform.OS === 'web') return 'Web preview';
  if (isExpoGo()) return 'Expo Go preview';
  if (__DEV__) return 'Development build';
  return 'Installed app';
}
