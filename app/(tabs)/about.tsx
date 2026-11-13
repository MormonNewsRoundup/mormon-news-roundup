import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { BottomAdSlot } from '@/components/BottomAdSlot';
import { BrandHeader } from '@/components/BrandHeader';
import { Icon } from '@/components/Icon';
import { PurchasePanel } from '@/components/PurchasePanel';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import {
  ABOUT_INTRO,
  ADS_ENABLED,
  APP_PITCH,
  APP_SUPPORT_URL,
  BREAKING_NEWS_URL,
  PATREON_URL,
  PRIVACY_POLICY_URL,
  WEBSITE_URL,
  YOUTUBE_CHANNEL_URL,
} from '@/constants/config';
import { openExternal } from '@/lib/links';
import { previewRuntimeLabel, showPreviewTools } from '@/lib/runtime';

export default function AboutScreen() {
  const theme = useTheme();
  const { adsRemoved, setAdsRemoved } = useAppState();
  const version = Constants.expoConfig?.version ?? '1.0.3';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="About" subtitle={APP_PITCH} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PurchasePanel />
        <Text style={[styles.paragraph, { color: theme.text }]}>{ABOUT_INTRO}</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          Tap a story to read it here. Videos play in the app, podcasts use the audio player when an
          episode file is available, and the original page opens in the in-app browser.
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
        <LinkRow
          label="Read on the web"
          detail={BREAKING_NEWS_URL.replace('https://', '')}
          onPress={() => void openExternal(BREAKING_NEWS_URL)}
        />
        <LinkRow
          label="Privacy Policy"
          detail={PRIVACY_POLICY_URL.replace('https://', '')}
          onPress={() => void openExternal(PRIVACY_POLICY_URL)}
        />
        <LinkRow
          label="App Support"
          detail={APP_SUPPORT_URL.replace('https://', '')}
          onPress={() => void openExternal(APP_SUPPORT_URL)}
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

        {showPreviewTools() ? (
          <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.previewKicker, { color: theme.muted }]}>
              {previewRuntimeLabel()}
            </Text>
            {ADS_ENABLED ? (
              <>
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
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.version, { color: theme.muted }]}>Version {version}</Text>
        <ScreenDisclaimer />
      </ScrollView>
      <BottomAdSlot />
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
