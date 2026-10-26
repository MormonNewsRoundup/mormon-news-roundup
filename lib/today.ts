import type { DayFile, FeedItem } from '@/lib/types';

/** How many stories Today shows at most. */
export const TODAY_STORY_LIMIT = 15;

export type DatedStory = {
  item: FeedItem;
  date: string;
};

/** Index dates, newest calendar day first. */
export function datesNewestFirst(days: string[]): string[] {
  return [...days].sort((a, b) => b.localeCompare(a));
}

/**
 * Newest stories across the given days. The same id or the same link is kept
 * once, as the newest copy. There is no age cutoff.
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
