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
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import { ADS_ENABLED, APP_PITCH, isBundledFeed } from '@/constants/config';
import { serifFamily } from '@/constants/theme';
import { getDay, getIndex, subscribeFeedRefresh } from '@/lib/feed';
import { datesNewestFirst, isOwnChannelItem, orderedStories, recentStories, TODAY_STORY_LIMIT, type DatedStory } from '@/lib/today';
import type { DayFile, FeedIndex } from '@/lib/types';

type Row =
  | { key: string; kind: 'banner' }
  | { key: string; kind: 'card'; story: DatedStory }
  | { key: string; kind: 'ad' };

function buildRows(stories: DatedStory[], sample: boolean, adsRemoved: boolean): Row[] {
  const rows: Row[] = [];
  if (sample) rows.push({ key: 'banner', kind: 'banner' });
  stories.forEach((story, index) => {
    const cards = index + 1;
    rows.push({ key: story.item.id, kind: 'card', story });
    if (ADS_ENABLED && !adsRemoved && (cards === 1 || cards % 4 === 0)) {
      rows.push({ key: `ad-${story.item.id}`, kind: 'ad' });
    }
  });
  if (ADS_ENABLED && !adsRemoved && stories.length > 0 && stories.length % 4 !== 0) {
    rows.push({ key: 'ad-end', kind: 'ad' });
  }
  return rows;
}

async function loadRecent(force: boolean): Promise<{ index: FeedIndex; stories: DatedStory[]; more: boolean }> {
  const index = await getIndex(force);
  const dates = datesNewestFirst(index.days);
  const loaded: DayFile[] = [];
  let stories: DatedStory[] = [];
  for (const date of dates) {
    loaded.push(await getDay(date, force));
    stories = recentStories(loaded);
    const seenOwn = loaded.some((day) =>
      day.editions.some((edition) => edition.items.some((item) => isOwnChannelItem(item))),
    );
    // Keep reading until the newest own-channel video is in hand, then stop at 15.
    if (stories.length >= TODAY_STORY_LIMIT && seenOwn) break;
  }
  const more = loaded.length < dates.length || orderedStories(loaded).length > stories.length;
  return { index, stories, more };
}

export default function LatestScreen() {
  const theme = useTheme();
  const { adsRemoved } = useAppState();
  const [index, setIndex] = useState<FeedIndex | null>(null);
  const [stories, setStories] = useState<DatedStory[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    const next = await loadRecent(force);
    setIndex(next.index);
    setStories(next.stories);
    setMore(next.more);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load(false);
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

  useEffect(() => {
    return subscribeFeedRefresh(() => {
      void load(true).catch((err) => {
        setError(err instanceof Error ? err.message : 'The feed did not load.');
      });
    });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The feed did not load.');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const sample = Boolean(index?.sample) || isBundledFeed();
  const rows = useMemo(() => buildRows(stories, sample, adsRemoved), [adsRemoved, sample, stories]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="Latest Headlines" subtitle={APP_PITCH} />
      {loading ? (
        <View style={styles.fill}>
          <View style={styles.centered}>
            <ActivityIndicator color={theme.header} />
            <Text style={[styles.status, { color: theme.muted }]}>Gathering the latest stories…</Text>
          </View>
          <ScreenDisclaimer />
        </View>
      ) : error && stories.length === 0 ? (
        <View style={styles.fill}>
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
          <ScreenDisclaimer />
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.fill}>
          <View style={styles.centered}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No stories in the feed yet.
            </Text>
          </View>
          <ScreenDisclaimer />
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
              <Text style={[styles.status, { color: theme.muted }]}>
                {sample && !more
                  ? 'That’s the whole sample archive.'
                  : more
                    ? 'Older stories are in Search.'
                    : 'You’re caught up.'}
              </Text>
              <ScreenDisclaimer />
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
            if (item.kind === 'ad') return <AdBanner />;
            return <NewsCard item={item.story.item} />;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  list: { paddingTop: 16, paddingBottom: 8, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  status: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  errorTitle: { fontFamily: serifFamily, fontSize: 24, textAlign: 'center' },
  emptyTitle: { fontFamily: serifFamily, fontSize: 22, lineHeight: 28, textAlign: 'center' },
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
  footer: { marginTop: 'auto', paddingHorizontal: 20, paddingTop: 4, gap: 12 },
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
