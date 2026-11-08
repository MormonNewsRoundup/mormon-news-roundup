import { useAppState } from '@/components/AppState';
import { AdBannerPlaceholder } from '@/components/AdPlaceholder';
import { ADS_ENABLED } from '@/constants/config';
import { canUseNativeAds } from '@/lib/runtime';

/** Small banner above the tab bar. Hidden after Remove Ads. */
export function BottomAdSlot() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;
  if (!canUseNativeAds()) return <AdBannerPlaceholder />;

  const { BottomAdBanner } = require('./BottomAdBanner') as typeof import('./BottomAdBanner');
  return <BottomAdBanner />;
}
