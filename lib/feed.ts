import AsyncStorage from '@react-native-async-storage/async-storage';

import { feedBaseUrl, isBundledFeed } from '@/constants/config';
import type { DayFile, Edition, FeedIndex, FeedItem } from '@/lib/types';

const INDEX_KEY = 'mnr.feed.index.v1';
const dayKey = (date: string) => `mnr.feed.day.v1.${date}`;

const bundledIndex = require('../feed/index.json') as FeedIndex;

const bundledDays: Record<string, DayFile> = {
  '2026-10-23': require('../feed/days/2026-10-23.json') as DayFile,
  '2026-10-24': require('../feed/days/2026-10-24.json') as DayFile,
  '2026-10-25': require('../feed/days/2026-10-25.json') as DayFile,
};

function sortItems(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function sortEditions(editions: Edition[]): Edition[] {
  return [...editions]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((edition) => ({ ...edition, items: sortItems(edition.items) }));
}

export function prepareDay(day: DayFile): DayFile {
  return { ...day, editions: sortEditions(day.editions) };
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full cache should not block the screen. The network copy still shows.
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  // A unique query skips the GitHub Pages cache so a push shows up on refresh.
  const href = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const response = await fetch(href, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`The feed file could not be downloaded (${response.status}).`);
  }
  return (await response.json()) as T;
}

function assertIndex(value: FeedIndex): FeedIndex {
  if (!value || !Array.isArray(value.days)) {
    throw new Error('The feed index is missing its list of days.');
  }
  return value;
}

function assertDay(value: DayFile, date: string): DayFile {
  if (!value || value.date !== date || !Array.isArray(value.editions)) {
    throw new Error(`The file for ${date} does not look like a day of news.`);
  }
  return prepareDay(value);
}

export async function getIndex(force = false): Promise<FeedIndex> {
  if (isBundledFeed()) return assertIndex(bundledIndex);

  if (!force) {
    const cached = await readCache<FeedIndex>(INDEX_KEY);
    if (cached?.days?.length) return cached;
  }

  try {
    const fresh = assertIndex(await fetchJson<FeedIndex>(`${feedBaseUrl()}/index.json`));
    await writeCache(INDEX_KEY, fresh);
    return fresh;
  } catch {
    const cached = await readCache<FeedIndex>(INDEX_KEY);
    if (cached?.days?.length) return cached;
    // Last resort when the phone has never saved a copy and the site is unreachable.
    return assertIndex(bundledIndex);
  }
}

export async function getDay(date: string, force = false): Promise<DayFile> {
  if (isBundledFeed()) {
    const bundled = bundledDays[date];
    if (!bundled) {
      throw new Error(
        `The bundled sample has no file for ${date}. Add it under feed/days and register it in lib/feed.ts, or set FEED_BASE_URL.`,
      );
    }
    return assertDay(bundled, date);
  }

  const key = dayKey(date);
  if (!force) {
    const cached = await readCache<DayFile>(key);
    if (cached) return assertDay(cached, date);
  }

  try {
    const fresh = assertDay(await fetchJson<DayFile>(`${feedBaseUrl()}/days/${date}.json`), date);
    await writeCache(key, fresh);
    return fresh;
  } catch (error) {
    const cached = await readCache<DayFile>(key);
    if (cached) return assertDay(cached, date);
    const bundled = bundledDays[date];
    if (bundled) return assertDay(bundled, date);
    throw error;
  }
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export function itemsFromDays(days: DayFile[]): FeedItem[] {
  return days.flatMap((day) => day.editions.flatMap((edition) => edition.items));
}
