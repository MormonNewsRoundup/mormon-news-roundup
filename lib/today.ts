import type { DayFile, FeedItem } from '@/lib/types';

/** How many stories Today shows at most. */
export const TODAY_STORY_LIMIT = 15;

/** Stories older than this stay in Search. */
export const TODAY_FRESH_MS = 48 * 60 * 60 * 1000;

export type DatedStory = {
  item: FeedItem;
  date: string;
};

/**
 * Newest stories across the given days. The same id or the same link is kept
 * once, as the newest copy.
 */
export function recentStories(days: DayFile[], limit = TODAY_STORY_LIMIT): DatedStory[] {
  const flat: DatedStory[] = [];
  for (const day of days) {
    for (const edition of day.editions) {
      for (const item of edition.items) {
        flat.push({ item, date: day.date });
      }
    }
  }
  flat.sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt) || b.date.localeCompare(a.date));

  const seen = new Set<string>();
  const picked: DatedStory[] = [];
  for (const entry of flat) {
    if (seen.has(entry.item.id) || seen.has(entry.item.url)) continue;
    seen.add(entry.item.id);
    seen.add(entry.item.url);
    picked.push(entry);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Newest stories whose publishedAt is inside the last 48 hours, at most 15. */
export function freshStories(days: DayFile[], now = Date.now(), limit = TODAY_STORY_LIMIT): DatedStory[] {
  const cutoff = now - TODAY_FRESH_MS;
  return recentStories(days, Number.MAX_SAFE_INTEGER)
    .filter((entry) => {
      const published = Date.parse(entry.item.publishedAt);
      return Number.isFinite(published) && published >= cutoff && published <= now;
    })
    .slice(0, limit);
}

/**
 * Day files that can still hold a story from the last 48 hours.
 * Index dates are calendar dates; one extra day covers Eastern Time vs UTC.
 */
export function datesWithinFreshWindow(days: string[], now = Date.now()): string[] {
  const oldest = new Date(now - TODAY_FRESH_MS - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [...days]
    .sort((a, b) => b.localeCompare(a))
    .filter((date) => date >= oldest)
    .slice(0, 7);
}
