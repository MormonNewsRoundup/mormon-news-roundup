import { useAppState } from '@/components/AppState';
import { AdCardPlaceholder } from '@/components/AdPlaceholder';
import { ADS_ENABLED } from '@/constants/config';

/** Web never loads react-native-google-mobile-ads. */
export function AdBanner() {
  const { adsRemoved } = useAppState();
  if (!ADS_ENABLED || adsRemoved) return null;
  return <AdCardPlaceholder />;
}
