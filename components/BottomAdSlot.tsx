import { View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { AdBannerPlaceholder } from '@/components/AdPlaceholder';
import { RemoveAdsEntry } from '@/components/RemoveAdsEntry';
import { ADS_ENABLED } from '@/constants/config';
import { canUseNativeAds } from '@/lib/runtime';

/** Small banner above the tab bar, with Remove Ads beside it. Hidden after purchase. */
export function BottomAdSlot() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;
  return (
    <View>
      <RemoveAdsEntry />
      {canUseNativeAds() ? <NativeBanner /> : <AdBannerPlaceholder />}
    </View>
  );
}

function NativeBanner() {
  const { BottomAdBanner } = require('./BottomAdBanner') as typeof import('./BottomAdBanner');
  return <BottomAdBanner />;
}
