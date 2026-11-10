import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { useTheme } from '@/components/useTheme';
import {
  REMOVE_ADS_BUTTON_LABEL,
  REMOVE_ADS_PRICE_LABEL,
  REMOVE_ADS_PRODUCT_ID,
  RESTORE_PURCHASES_LABEL,
} from '@/constants/config';
import { tell } from '@/lib/notice';
import { lookupRemoveAds, purchaseRemoveAds, restoreRemoveAds, type ProductLookup } from '@/lib/purchases';
import { canUseIap } from '@/lib/runtime';

type ProductState = ProductLookup | { status: 'loading' };

function previewMessage(): string {
  return 'The $0.99 purchase and restore run in the App Store app, including Apple’s review sandbox. In this preview the buttons stay visible and do not charge you.';
}

/**
 * Remove Ads and Restore Purchases. Both render on the first frame and stay
 * on screen if the product query is slow, fails, or returns nothing.
 */
export function PurchasePanel() {
  const theme = useTheme();
  const { adsRemoved, setAdsRemoved } = useAppState();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [product, setProduct] = useState<ProductState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setProduct({ status: 'loading' });
    void lookupRemoveAds().then((result) => {
      if (!cancelled) setProduct(result);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  async function onRemoveAds() {
    if (!canUseIap()) {
      tell('Purchases need the App Store app', previewMessage());
      return;
    }
    setBusy('buy');
    const outcome = await purchaseRemoveAds();
    setBusy(null);
    if (outcome.status === 'purchased') {
      await setAdsRemoved(true);
      tell('Ads removed', 'Thank you. The ad spots are hidden on this phone.');
      return;
    }
    if (outcome.status === 'cancelled' || outcome.status === 'unavailable') return;
    if (outcome.status === 'not-found') {
      tell('Remove Ads isn’t listed yet', 'The purchase sheet could not find remove_ads for this build.');
      return;
    }
    if (outcome.status === 'error') tell('Purchase didn’t finish', outcome.message);
  }

  async function onRestore() {
    if (!canUseIap()) {
      tell('Restore needs the App Store app', previewMessage());
      return;
    }
    setBusy('restore');
    const outcome = await restoreRemoveAds();
    setBusy(null);
    if (outcome.status === 'restored') {
      await setAdsRemoved(true);
      tell('Purchase restored', 'Ads stay off on this Apple ID.');
      return;
    }
    if (outcome.status === 'not-found') {
      tell('Nothing to restore', 'This Apple ID has not bought Remove Ads.');
      return;
    }
    if (outcome.status === 'unavailable') return;
    if (outcome.status === 'error') tell('Restore didn’t finish', outcome.message);
  }

  const status = statusLine(product, adsRemoved);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.gold }]}>
      <Text style={[styles.kicker, { color: theme.muted }]}>In-app purchase</Text>
      <Text style={[styles.title, { color: theme.text }]}>Remove Ads</Text>
      <Text style={[styles.detail, { color: theme.muted }]}>
        {`One-time purchase of ${REMOVE_ADS_PRICE_LABEL}. Hides the ad cards and the bottom banner on this phone. App Store product: ${REMOVE_ADS_PRODUCT_ID}.`}
      </Text>
      {adsRemoved ? (
        <Text style={[styles.owned, { color: theme.text }]}>Purchased on this phone. Ads are hidden.</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={REMOVE_ADS_BUTTON_LABEL}
        onPress={() => void onRemoveAds()}
        style={({ pressed }) => [styles.buy, { backgroundColor: theme.header }, pressed && styles.pressed]}>
        <Text style={[styles.buyText, { color: theme.gold }]}>{REMOVE_ADS_BUTTON_LABEL}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={RESTORE_PURCHASES_LABEL}
        onPress={() => void onRestore()}
        style={({ pressed }) => [
          styles.restore,
          { borderColor: theme.header, backgroundColor: theme.background },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.restoreText, { color: theme.text }]}>{RESTORE_PURCHASES_LABEL}</Text>
      </Pressable>
      <Text style={[styles.status, { color: theme.muted }]}>
        {busy === 'buy' ? 'Contacting the App Store…' : busy === 'restore' ? 'Restoring…' : status}
      </Text>
      {product.status === 'error' || product.status === 'missing' ? (
        <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} hitSlop={8}>
          <Text style={[styles.retry, { color: theme.link }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function statusLine(product: ProductState, adsRemoved: boolean): string {
  if (adsRemoved && product.status !== 'loading') {
    return 'Restore Purchases puts the same purchase back on a new phone.';
  }
  if (product.status === 'loading') return 'Checking the App Store… The buttons above stay available.';
  if (product.status === 'ready') return `App Store price confirmed: ${product.price}.`;
  if (product.status === 'missing') {
    return 'The App Store didn’t list remove_ads for this build yet. You can still try the purchase.';
  }
  if (product.status === 'error') return product.message;
  return 'These buttons stay on screen in every build. The charge runs in the App Store app, including Apple’s review sandbox.';
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800' },
  detail: { fontSize: 15, lineHeight: 21 },
  owned: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  buy: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buyText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  restore: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  restoreText: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  status: { fontSize: 13, lineHeight: 18 },
  retry: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.82 },
});
