import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { BottomAdSlot } from '@/components/BottomAdSlot';
import { BrandHeader } from '@/components/BrandHeader';
import { PurchasePanel } from '@/components/PurchasePanel';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import { TEXT_SIZES, type TextSize } from '@/lib/textSize';

export default function SettingsScreen() {
  const theme = useTheme();
  const { alertsEnabled, setAlertsEnabled, textSize, setTextSize } = useAppState();
  const version = Constants.expoConfig?.version ?? '1.0.3';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="Settings" subtitle="Purchases, alerts, and reading." />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PurchasePanel />

        <Text style={[styles.section, { color: theme.muted }]}>Breaking news</Text>
        <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Edition alerts</Text>
            <Text style={[styles.rowDetail, { color: theme.muted }]}>
              On this iPhone, the app checks for a new edition or a newly pinned story when you open
              it, and iOS may also check in the background. Alerts stay on this phone. There is no
              account, so they are not instant server pushes.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Edition alerts"
            value={alertsEnabled}
            onValueChange={(value) => void setAlertsEnabled(value)}
            trackColor={{ false: theme.border, true: theme.header }}
            thumbColor={theme.gold}
          />
        </View>

        <Text style={[styles.section, { color: theme.muted }]}>Text size</Text>
        <View style={styles.sizes}>
          {TEXT_SIZES.map((option) => {
            const selected = option.id === textSize;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => void setTextSize(option.id as TextSize)}
                style={[styles.size, { backgroundColor: selected ? theme.chipActive : theme.chip }]}>
                <Text style={{ color: selected ? theme.chipActiveText : theme.chipText, fontWeight: '700' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.note, { color: theme.muted }]}>
          Privacy Policy, App Support, and the Church disclaimer are on the About tab.
        </Text>
        <Text style={[styles.version, { color: theme.muted }]}>Version {version}</Text>
        <ScreenDisclaimer />
      </ScrollView>
      <BottomAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 8, flexGrow: 1 },
  section: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 16, fontWeight: '800' },
  rowDetail: { fontSize: 14, lineHeight: 20 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  size: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  note: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  version: { textAlign: 'center', marginTop: 8, fontSize: 13 },
});
