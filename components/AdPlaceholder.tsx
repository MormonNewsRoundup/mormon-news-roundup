import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { serifFamily } from '@/constants/theme';

/** Expo Go and web stand-in for a feed native ad. No ad SDK is loaded. */
export function AdCardPlaceholder() {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Advertisement"
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow },
      ]}>
      <View style={[styles.media, { backgroundColor: theme.ad }]}>
        <View style={[styles.badge, { backgroundColor: theme.header }]}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>Ad</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: theme.muted }]}>Ad</Text>
        <Text style={[styles.title, { color: theme.text }]}>Advertisement</Text>
        <Text style={[styles.summary, { color: theme.muted }]}>
          A labeled ad card. The App Store build loads a Google ad here.
        </Text>
      </View>
    </View>
  );
}

/** Thin stand-in for the bottom banner in Expo Go and on the web. */
export function AdBannerPlaceholder() {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Advertisement"
      style={[styles.banner, { backgroundColor: theme.ad, borderTopColor: theme.border }]}>
      <Text style={[styles.bannerText, { color: theme.adText }]}>Ad</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },
  kicker: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: serifFamily,
    fontSize: 20,
    lineHeight: 26,
  },
  summary: {
    fontSize: 15,
    lineHeight: 21,
  },
  banner: {
    minHeight: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
