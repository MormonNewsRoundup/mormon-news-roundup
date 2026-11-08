import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { useTheme } from '@/components/useTheme';
import { bannerAdUnitId, useAdsSession } from '@/lib/mobileAds';

/**
 * 320×50 banner anchored at the bottom of a tab. Stays collapsed until the
 * ad loads, and disappears if the request fails.
 */
export function BottomAdBanner() {
  const theme = useTheme();
  const { session, failed: sessionFailed } = useAdsSession();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (sessionFailed || failed || !session) return null;

  return (
    <View
      accessibilityLabel="Advertisement"
      style={[
        styles.bar,
        { backgroundColor: theme.tabBar, borderTopColor: theme.border },
        !loaded && styles.collapsed,
      ]}>
      <BannerAd
        unitId={bannerAdUnitId()}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: session.nonPersonalized }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  collapsed: {
    height: 0,
    borderTopWidth: 0,
  },
});
