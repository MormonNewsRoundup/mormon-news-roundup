import type { DayFile, FeedItem } from '@/lib/types';

/** How many stories Latest shows at most. */
export const TODAY_STORY_LIMIT = 15;

/** How many stories Search shows after Latest when no filters are set. */
export const SEARCH_AFTER_TODAY_LIMIT = 50;

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

/** Every unique story, newest first, with the same dedupe as Latest. */
export function orderedStories(days: DayFile[]): DatedStory[] {
  return recentStories(days, Number.MAX_SAFE_INTEGER);
}

/**
 * Search's default list: the stories immediately after Latest, at most 50.
 * Same order and the same id/url dedupe, so the two screens do not repeat a story.
 */
export function storiesAfterLatest(days: DayFile[]): DatedStory[] {
  return orderedStories(days).slice(TODAY_STORY_LIMIT, TODAY_STORY_LIMIT + SEARCH_AFTER_TODAY_LIMIT);
}
