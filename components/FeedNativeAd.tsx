import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAdChoicesPlacement,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
  useNativeAd,
} from 'react-native-google-mobile-ads';

import { useTheme } from '@/components/useTheme';
import { serifFamily } from '@/constants/theme';
import { nativeAdUnitId, useAdsSession } from '@/lib/mobileAds';

/**
 * In-feed native ad, styled as a news card. Renders nothing until an ad
 * loads, and nothing if the SDK or the request fails.
 */
export function FeedNativeAd() {
  const theme = useTheme();
  const { session, failed } = useAdsSession();
  const ready = Boolean(session) && !failed;
  const requestOptions = useMemo(
    () => ({
      requestNonPersonalizedAdsOnly: session?.nonPersonalized ?? true,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    }),
    [session?.nonPersonalized],
  );
  const { nativeAd } = useNativeAd({
    adUnitId: ready ? nativeAdUnitId() : null,
    requestOptions,
    autoLoad: ready,
  });

  if (failed || !nativeAd?.headline) return null;

  const advertiser = nativeAd.advertiser?.trim() ?? '';
  const body = nativeAd.body?.trim() ?? '';
  const callToAction = nativeAd.callToAction?.trim() ?? '';
  const iconUrl = nativeAd.icon?.url?.trim() ?? '';

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow },
      ]}>
      <View style={[styles.mediaWrap, { backgroundColor: theme.header }]}>
        <NativeMediaView style={styles.media} resizeMode="cover" />
        <View
          accessibilityLabel="Advertisement"
          style={[styles.badge, { backgroundColor: theme.header }]}
          pointerEvents="none">
          <Text style={[styles.badgeText, { color: theme.gold }]}>Ad</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.kicker, { color: theme.muted }]}>Ad</Text>
          {advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={[styles.advertiser, { color: theme.muted }]}>{advertiser}</Text>
            </NativeAsset>
          ) : null}
        </View>
        <View style={styles.headlineRow}>
          {iconUrl ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: iconUrl }} style={styles.icon} accessibilityIgnoresInvertColors />
            </NativeAsset>
          ) : null}
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.title, { color: theme.text }]}>{nativeAd.headline}</Text>
          </NativeAsset>
        </View>
        {body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={[styles.summary, { color: theme.muted }]}>{body}</Text>
          </NativeAsset>
        ) : null}
      </View>
      {callToAction ? (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={[styles.cta, { color: theme.link }]}>{callToAction}</Text>
          </NativeAsset>
        </View>
      ) : null}
    </NativeAdView>
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
  mediaWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  media: {
    width: '100%',
    height: '100%',
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
    paddingBottom: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  advertiser: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    flex: 1,
    fontFamily: serifFamily,
    fontSize: 20,
    lineHeight: 26,
  },
  summary: {
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cta: {
    fontSize: 15,
    fontWeight: '700',
  },
});
