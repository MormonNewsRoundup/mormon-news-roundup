import { useAppState } from '@/components/AppState';
import { AdBannerPlaceholder } from '@/components/AdPlaceholder';
import { ADS_ENABLED } from '@/constants/config';

/** Web never loads react-native-google-mobile-ads. */
export function BottomAdSlot() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;
  return <AdBannerPlaceholder />;
}
