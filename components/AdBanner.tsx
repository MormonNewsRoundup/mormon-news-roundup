import { useAppState } from '@/components/AppState';
import { AdCardPlaceholder } from '@/components/AdPlaceholder';
import { ADS_ENABLED } from '@/constants/config';
import { canUseNativeAds } from '@/lib/runtime';

/**
 * Feed ad slot. Expo Go shows a labeled card and does not load the ads
 * package. Web uses AdBanner.web.tsx so the native module stays out of that
 * bundle. A failed native ad renders nothing.
 */
export function AdBanner() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;
  if (!canUseNativeAds()) return <AdCardPlaceholder />;

  const { FeedNativeAd } = require('./FeedNativeAd') as typeof import('./FeedNativeAd');
  return <FeedNativeAd />;
}
