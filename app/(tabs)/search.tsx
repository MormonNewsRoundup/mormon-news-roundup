import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { NewsCard } from '@/components/NewsCard';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import { getDay, getIndex, itemsFromDays, mapPool } from '@/lib/feed';
import { localDateInputValue, rangeForTimeframe, searchItems, TIMEFRAMES, type Timeframe } from '@/lib/search';
import { CONTENT_TYPES, filterLabel, type FeedItem, type TypeFilter } from '@/lib/types';
import { serifFamily } from '@/constants/theme';

const FILTERS: TypeFilter[] = ['all', ...CONTENT_TYPES];

export default function SearchScreen() {
  const theme = useTheme();
  const [archive, setArchive] = useState<FeedItem[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('any');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    // Every day listed in the index, not only the fresh Today window.
    // getDay reads the saved copy first, then the network.
    const index = await getIndex(force);
    const days = await mapPool(index.days, 4, (date) => getDay(date, force));
    setArchive(itemsFromDays(days));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load(false);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search could not load the archive.');
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
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search could not load the archive.');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const browsing = query.trim().length > 0 || filter !== 'all' || timeframe !== 'any';
  const results = useMemo(
    () =>
      browsing
        ? searchItems(archive, query, filter, rangeForTimeframe(timeframe, Date.now(), fromDate, toDate))
        : [],
    [archive, browsing, filter, fromDate, query, timeframe, toDate],
  );

  function chooseTimeframe(next: Timeframe) {
    setTimeframe(next);
    if (next === 'custom') {
      const now = Date.now();
      setFromDate((current) => current || localDateInputValue(now - 7 * 24 * 60 * 60 * 1000));
      setToDate((current) => current || localDateInputValue(now));
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="Search" subtitle="Titles, summaries, and sources." />
      <View style={styles.controls}>
        <View style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon ios="magnifyingglass" android="search" color={theme.muted} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search the archive"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.input, { color: theme.text }]}
            accessibilityLabel="Search the archive"
          />
          {query.length > 0 ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
              <Text style={[styles.clear, { color: theme.muted }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {FILTERS.map((option) => {
            const selected = option === filter;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.chipActive : theme.chip,
                  },
                ]}>
                <Text style={{ color: selected ? theme.chipActiveText : theme.chipText, fontWeight: '700' }}>
                  {filterLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.timeChips}>
          {TIMEFRAMES.map((option) => {
            const selected = option.id === timeframe;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => chooseTimeframe(option.id)}
                style={[styles.chip, { backgroundColor: selected ? theme.chipActive : theme.chip }]}>
                <Text style={{ color: selected ? theme.chipActiveText : theme.chipText, fontWeight: '700' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {timeframe === 'custom' ? (
          <View style={styles.dates}>
            <DateField label="From" value={fromDate} onChange={setFromDate} />
            <DateField label="To" value={toDate} onChange={setToDate} />
          </View>
        ) : null}
      </View>
      {loading ? (
        <View style={styles.fill}>
          <View style={styles.centered}>
            <ActivityIndicator color={theme.header} />
            <Text style={[styles.body, { color: theme.muted }]}>Loading the archive…</Text>
          </View>
          <ScreenDisclaimer />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.gold}
              colors={[theme.header]}
            />
          }
          contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
          ListFooterComponent={<ScreenDisclaimer />}
          ListHeaderComponent={
            browsing && !error ? (
              <Text style={[styles.count, { color: theme.muted }]}>
                {results.length === 1 ? '1 item' : `${results.length} items`}
                {query.trim() ? ` for “${query.trim()}”` : ''}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {error ? 'Search is unavailable' : browsing ? 'Nothing matches' : 'Search the archive'}
              </Text>
              <Text style={[styles.body, { color: theme.muted }]}>
                {error
                  ? error
                  : browsing
                    ? 'Nothing matches that type, time range, and search. Try Any time, or a different word.'
                    : `Look through ${archive.length} items, newest first. Type a word like “lawsuit” or “podcast”, or pick a type and a time range.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => <NewsCard item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  controls: { paddingTop: 12, gap: 10 },
  field: {
    marginHorizontal: 16,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  clear: { fontWeight: '700', fontSize: 14 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  dates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  list: { paddingTop: 8, paddingBottom: 8, flexGrow: 1 },
  emptyList: { flexGrow: 1, paddingBottom: 8 },
  count: { marginHorizontal: 20, marginBottom: 10, fontSize: 13, fontWeight: '700' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  emptyTitle: { fontFamily: serifFamily, fontSize: 26, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
