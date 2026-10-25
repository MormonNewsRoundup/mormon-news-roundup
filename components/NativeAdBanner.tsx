import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { useTheme } from '@/components/useTheme';

/**
 * Only required from AdBanner after canUseNativeAds() is true.
 * TestIds.BANNER is Google's sample unit:
 * iOS ca-app-pub-3940256099942544/2934735716
 * Android ca-app-pub-3940256099942544/6300978111
 * Replace TestIds.BANNER with your own banner unit before production.
 */
export function NativeAdBanner() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void mobileAds()
      .initialize()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !ready) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.ad, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.adText }]}>
          {failed ? 'Test ad did not load.' : 'Loading test ad…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
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
    padding: 12,
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
  },
  banner: {
    alignItems: 'center',
    marginBottom: 16,
  },
});
