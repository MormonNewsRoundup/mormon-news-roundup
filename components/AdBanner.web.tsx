import { StyleSheet, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { useTheme } from '@/components/useTheme';

/**
 * Web never loads react-native-google-mobile-ads. The native file does, and
 * the web bundler rejects that package even behind a runtime check.
 */
export function AdBanner() {
  const { adsRemoved } = useAppState();
  const theme = useTheme();
  if (adsRemoved) return null;

  return (
    <View
      accessibilityLabel="Advertisement placeholder"
      style={[styles.placeholder, { backgroundColor: theme.ad, borderColor: theme.border }]}>
      <Text style={[styles.kicker, { color: theme.adText }]}>AD</Text>
      <Text style={[styles.label, { color: theme.adText }]}>
        Preview stand-in. A Google test banner loads in an EAS build.
      </Text>
    </View>
  );
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
