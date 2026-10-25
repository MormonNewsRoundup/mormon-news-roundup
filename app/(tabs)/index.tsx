import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdBanner } from '@/components/AdBanner';
import { useAppState } from '@/components/AppState';
import { BrandHeader } from '@/components/BrandHeader';
import { NewsCard } from '@/components/NewsCard';
import { useTheme } from '@/components/useTheme';
import { APP_PITCH, isBundledFeed } from '@/constants/config';
import { serifFamily } from '@/constants/theme';
import { getDay, getIndex } from '@/lib/feed';
import { formatDayHeading } from '@/lib/format';
import type { DayFile, FeedIndex, FeedItem } from '@/lib/types';

type Row =
  | { key: string; kind: 'banner' }
  | { key: string; kind: 'date'; label: string }
  | { key: string; kind: 'card'; item: FeedItem }
  | { key: string; kind: 'ad' };

function buildRows(days: DayFile[], sample: boolean, adsRemoved: boolean): Row[] {
  const rows: Row[] = [];
  if (sample) rows.push({ key: 'banner', kind: 'banner' });
  let cards = 0;
  for (const day of days) {
    rows.push({ key: `date-${day.date}`, kind: 'date', label: formatDayHeading(day.date) });
    // Editions stay newest-first (noon, then midnight). Items inside each are newest-first.
    // The screen shows one list, with no edition heading between them.
    for (const edition of day.editions) {
      for (const item of edition.items) {
        rows.push({ key: item.id, kind: 'card', item });
        cards += 1;
        if (!adsRemoved && (cards === 1 || cards % 4 === 0)) {
          rows.push({ key: `ad-${item.id}`, kind: 'ad' });
        }
      }
    }
  }
  if (!adsRemoved && cards > 0 && cards % 4 !== 0) {
    rows.push({ key: 'ad-end', kind: 'ad' });
  }
  return rows;
}

export default function TodayScreen() {
  const theme = useTheme();
  const { adsRemoved } = useAppState();
  const [index, setIndex] = useState<FeedIndex | null>(null);
  const [days, setDays] = useState<DayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean, howMany: number) => {
    const nextIndex = await getIndex(force);
    const count = Math.min(Math.max(howMany, 1), nextIndex.days.length);
    const nextDays = await Promise.all(nextIndex.days.slice(0, count).map((date) => getDay(date, force)));
    setIndex(nextIndex);
    setDays(nextDays);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load(false, 1);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The feed did not load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await load(true, Math.max(days.length, 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The feed did not load.');
    } finally {
      setRefreshing(false);
    }
  }, [days.length, load]);

  const hasEarlier = Boolean(index && days.length < index.days.length);

  const loadEarlier = useCallback(async () => {
    if (!index || !hasEarlier || loadingEarlier) return;
    const date = index.days[days.length];
    setLoadingEarlier(true);
    setError(null);
    try {
      const day = await getDay(date);
      setDays((current) => [...current, day]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That day did not load.');
    } finally {
      setLoadingEarlier(false);
    }
  }, [days.length, hasEarlier, index, loadingEarlier]);

  const sample = Boolean(index?.sample) || isBundledFeed();
  const rows = useMemo(() => buildRows(days, sample, adsRemoved), [adsRemoved, days, sample]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="Today" subtitle={APP_PITCH} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.header} />
          <Text style={[styles.status, { color: theme.muted }]}>Gathering today’s edition…</Text>
        </View>
      ) : error && days.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.errorTitle, { color: theme.text }]}>The feed didn’t load</Text>
          <Text style={[styles.status, { color: theme.muted }]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onRefresh()}
            style={[styles.button, { backgroundColor: theme.header }]}>
            <Text style={[styles.buttonText, { color: theme.gold }]}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.gold}
              colors={[theme.header]}
            />
          }
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={styles.footer}>
              {error ? <Text style={[styles.status, { color: theme.muted }]}>{error}</Text> : null}
              {hasEarlier ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loadingEarlier}
                  onPress={() => void loadEarlier()}
                  style={[styles.button, { borderColor: theme.header, backgroundColor: theme.card }]}>
                  <Text style={[styles.buttonText, { color: theme.header }]}>
                    {loadingEarlier ? 'Loading…' : 'Load earlier days'}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.status, { color: theme.muted }]}>
                  {sample ? 'That’s the whole sample archive.' : 'You’re caught up.'}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'banner') {
              return (
                <View style={[styles.banner, { backgroundColor: theme.chip, borderColor: theme.border }]}>
                  <Text style={[styles.bannerTitle, { color: theme.text }]}>Sample data</Text>
                  <Text style={[styles.bannerBody, { color: theme.muted }]}>
                    These cards are placeholders so you can preview the app. They are not real news.
                  </Text>
                </View>
              );
            }
            if (item.kind === 'date') {
              return <Text style={[styles.date, { color: theme.text }]}>{item.label}</Text>;
            }
            if (item.kind === 'ad') return <AdBanner />;
            return <NewsCard item={item.item} />;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingTop: 16, paddingBottom: 28 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  status: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  errorTitle: { fontFamily: serifFamily, fontSize: 24, textAlign: 'center' },
  banner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  bannerTitle: { fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  bannerBody: { fontSize: 14, lineHeight: 20 },
  date: {
    fontFamily: serifFamily,
    fontSize: 22,
    lineHeight: 28,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  footer: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
