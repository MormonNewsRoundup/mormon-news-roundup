import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { BrandHeader } from '@/components/BrandHeader';
import { Icon } from '@/components/Icon';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import {
  APP_PITCH,
  PATREON_URL,
  REMOVE_ADS_PRICE_LABEL,
  WEBSITE_URL,
  YOUTUBE_CHANNEL_URL,
} from '@/constants/config';
import { openExternal } from '@/lib/links';
import { tell } from '@/lib/notice';
import { purchaseRemoveAds, restoreRemoveAds } from '@/lib/purchases';
import { canUseIap, previewRuntimeLabel, showPreviewTools } from '@/lib/runtime';

function previewPurchaseMessage(): string {
  return 'The $0.99 purchase and restore run in an EAS development build or the App Store app. In this preview, use the switch below to hide the ad boxes.';
}

export default function AboutScreen() {
  const theme = useTheme();
  const { adsRemoved, setAdsRemoved, replayWelcome } = useAppState();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function onRemoveAds() {
    if (adsRemoved && !showPreviewTools()) return;
    if (!canUseIap()) {
      tell('Purchases need the store build', previewPurchaseMessage());
      return;
    }
    setBusy('buy');
    const outcome = await purchaseRemoveAds();
    setBusy(null);
    if (outcome.status === 'purchased') {
      await setAdsRemoved(true);
      tell('Ads removed', 'Thank you. The banner spots are hidden on this phone.');
      return;
    }
    if (outcome.status === 'cancelled' || outcome.status === 'unavailable') return;
    if (outcome.status === 'error') tell('Purchase didn’t finish', outcome.message);
  }

  async function onRestore() {
    if (!canUseIap()) {
      tell('Restore needs the store build', previewPurchaseMessage());
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
      tell('Nothing to restore', 'This Apple ID has not bought Remove ads.');
      return;
    }
    if (outcome.status === 'error') tell('Restore didn’t finish', outcome.message);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="About" subtitle={APP_PITCH} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          Mormon News Roundup is the premier app for a daily, unfiltered look at Mormon news: the
          headlines, investigations, lawsuits, videos, and podcasts about The Church of Jesus Christ
          of Latter-day Saints, all in one place.
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          Tap a card to open the original article, video, or podcast.
        </Text>
        <Text style={[styles.paragraph, { color: theme.muted }]}>
          Stories can include lawsuits and sexual abuse cases. The App Store listing is meant for
          ages 17+.
        </Text>

        <Text style={[styles.section, { color: theme.muted }]}>Links</Text>
        <LinkRow
          label="Mormon News Roundup on YouTube"
          detail={YOUTUBE_CHANNEL_URL.replace('https://', '')}
          onPress={() => void openExternal(YOUTUBE_CHANNEL_URL)}
        />
        <LinkRow
          label="mormonnewsroundup.org"
          detail="The show’s website"
          onPress={() => void openExternal(WEBSITE_URL)}
        />

        <Text style={[styles.section, { color: theme.muted }]}>Support</Text>
        <Text style={[styles.paragraph, { color: theme.muted }]}>
          The show is independent. If it is useful to you, you can back it.
        </Text>
        <Pressable accessibilityRole="link" onPress={() => void openExternal(PATREON_URL)}>
          <Text style={[styles.patreon, { color: theme.link }]}>
            Support Mormon News Roundup on Patreon
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: theme.muted }]}>Ads</Text>
        <Text style={[styles.paragraph, { color: theme.muted }]}>
          {canUseIap()
            ? `Remove ads is a one-time purchase of ${REMOVE_ADS_PRICE_LABEL}. Restore puts it back on this Apple ID if you already bought it.`
            : 'This preview shows a labeled ad box. A real Google test banner, and the one-time purchase, turn on in an EAS build. Deleting the app clears the purchase on this phone until you restore it.'}
        </Text>
        <ActionRow
          label={adsRemoved ? 'Ads removed' : 'Remove ads'}
          detail={
            adsRemoved
              ? 'Banner spots stay hidden on this phone.'
              : `${REMOVE_ADS_PRICE_LABEL}, one time`
          }
          busy={busy === 'buy'}
          disabled={adsRemoved}
          onPress={() => void onRemoveAds()}
        />
        <ActionRow
          label="Restore purchase"
          detail="Already bought it on this Apple ID?"
          busy={busy === 'restore'}
          onPress={() => void onRestore()}
        />

        {showPreviewTools() ? (
          <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.previewKicker, { color: theme.muted }]}>
              {previewRuntimeLabel()}
            </Text>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Simulate ads removed</Text>
              <Switch
                accessibilityLabel="Simulate ads removed"
                value={adsRemoved}
                onValueChange={(value) => void setAdsRemoved(value)}
                trackColor={{ false: theme.border, true: theme.header }}
                thumbColor={theme.gold}
              />
            </View>
            <Text style={[styles.previewNote, { color: theme.muted }]}>
              This switch is only in the preview. It does not charge you, and it is hidden in the
              App Store build.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void replayWelcome()}>
              <Text style={[styles.patreon, { color: theme.link }]}>Show the welcome screen again</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.version, { color: theme.muted }]}>Version {version}</Text>
        <ScreenDisclaimer />
      </ScrollView>
    </View>
  );
}

function LinkRow({ label, detail, onPress }: { label: string; detail: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.rowDetail, { color: theme.muted }]}>{detail}</Text>
      </View>
      <Icon ios="chevron.right" android="chevron_right" color={theme.muted} size={18} />
    </Pressable>
  );
}

function ActionRow({
  label,
  detail,
  onPress,
  busy,
  disabled = false,
}: {
  label: string;
  detail: string;
  onPress: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{busy ? 'Working…' : label}</Text>
        <Text style={[styles.rowDetail, { color: theme.muted }]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 8, flexGrow: 1 },
  paragraph: { fontSize: 16, lineHeight: 24 },
  section: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '700' },
  rowDetail: { fontSize: 13, lineHeight: 18 },
  patreon: { fontSize: 16, fontWeight: '700', paddingVertical: 6 },
  preview: {
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  previewKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { fontSize: 16, fontWeight: '700', flex: 1 },
  previewNote: { fontSize: 13, lineHeight: 18 },
  version: { textAlign: 'center', marginTop: 12, fontSize: 13 },
  pressed: { opacity: 0.75 },
});
