/**
 * v1 does not ship an ad SDK. This renders nothing, including no
 * "Loading test ad…" line. Bring the banner back only after the owner
 * approves ads: set ADS_ENABLED, reinstall react-native-google-mobile-ads,
 * restore the app.json plugin, and replace this file with the previous
 * BannerAd implementation from git history. See the README section
 * "Turning ads and the remove-ads purchase back on".
 */
export function NativeAdBanner() {
  return null;
}
