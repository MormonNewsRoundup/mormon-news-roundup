import { StyleSheet, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { useTheme } from '@/components/useTheme';
import { ADS_ENABLED } from '@/constants/config';
import { canUseNativeAds } from '@/lib/runtime';

function AdPlaceholder({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Advertisement placeholder"
      style={[styles.placeholder, { backgroundColor: theme.ad, borderColor: theme.border }]}>
      <Text style={[styles.kicker, { color: theme.adText }]}>AD</Text>
      <Text style={[styles.label, { color: theme.adText }]}>{label}</Text>
    </View>
  );
}

/**
 * Real banners need an EAS development build. Expo Go renders a box and does
 * not load the ads package. Web uses AdBanner.web.tsx so this file, and its
 * require() of the native module, stays out of the web bundle.
 */
export function AdBanner() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;

  if (!canUseNativeAds()) {
    return (
      <AdPlaceholder label="Preview stand-in. A Google test banner loads in an EAS build." />
    );
  }

  const { NativeAdBanner } = require('./NativeAdBanner') as typeof import('./NativeAdBanner');
  return <NativeAdBanner />;
}

const styles = StyleSheet.create({
  placeholder: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
