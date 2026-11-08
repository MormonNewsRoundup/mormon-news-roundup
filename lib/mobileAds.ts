import { useEffect, useState } from 'react';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { TestIds } from 'react-native-google-mobile-ads';

/**
 * Native-only. Import this from components that already sit behind
 * canUseNativeAds(), never from a web bundle. Web files use the .web.tsx
 * stand-ins so Metro does not pull this module in.
 */

/** AdMob feed native unit. Release builds only. */
const FEED_NATIVE_UNIT_ID = 'ca-app-pub-9312708404620157/5656470489';

/** AdMob bottom banner unit. Release builds only. */
const BOTTOM_BANNER_UNIT_ID = 'ca-app-pub-9312708404620157/8688818777';

export type AdsSession = {
  /** True until iOS App Tracking Transparency is authorized. */
  nonPersonalized: boolean;
};

let pending: Promise<AdsSession> | null = null;

/**
 * Ask for tracking permission, then start the Google Mobile Ads SDK once.
 * Later callers share the same promise. A failed start can be tried again.
 */
export function adsSession(): Promise<AdsSession> {
  if (!pending) {
    pending = startSession().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function startSession(): Promise<AdsSession> {
  // Non-personalized until App Tracking Transparency is allowed. On Android the
  // permission API resolves as granted without a prompt.
  let nonPersonalized = true;
  try {
    const permission = await requestTrackingPermissionsAsync();
    nonPersonalized = permission.status !== 'granted';
  } catch {
    nonPersonalized = true;
  }
  await mobileAds().initialize();
  return { nonPersonalized };
}

export function nativeAdUnitId(): string {
  return __DEV__ ? TestIds.NATIVE : FEED_NATIVE_UNIT_ID;
}

export function bannerAdUnitId(): string {
  return __DEV__ ? TestIds.BANNER : BOTTOM_BANNER_UNIT_ID;
}

export function useAdsSession(): { session: AdsSession | null; failed: boolean } {
  const [session, setSession] = useState<AdsSession | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void adsSession()
      .then((value) => {
        if (!cancelled) setSession(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, failed };
}
