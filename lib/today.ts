import type { DayFile, FeedItem } from '@/lib/types';

/** How many stories Latest shows at most. */
export const TODAY_STORY_LIMIT = 15;

/** How many stories Search shows after Latest when no filters are set. */
export const SEARCH_AFTER_TODAY_LIMIT = 50;

/** Videos and Shorts published on the owner's own YouTube channel. */
export const OWN_CHANNEL_SOURCE = 'Mormon News Roundup';

export type DatedStory = {
  item: FeedItem;
  date: string;
};

/** Index dates, newest calendar day first. */
export function datesNewestFirst(days: string[]): string[] {
  return [...days].sort((a, b) => b.localeCompare(a));
}

/**
 * A Mormon News Roundup YouTube video or Short.
 * The feed marks those with source "Mormon News Roundup". A channel field, when present, wins.
 */
export function isOwnChannelItem(item: FeedItem): boolean {
  if (item.type !== 'video') return false;
  const channel = typeof item.channel === 'string' ? item.channel.trim() : '';
  const name = channel || item.source.trim();
  return name === OWN_CHANNEL_SOURCE;
}

function dedupeNewest(days: DayFile[]): DatedStory[] {
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
  const unique: DatedStory[] = [];
  for (const entry of flat) {
    if (seen.has(entry.item.id) || seen.has(entry.item.url)) continue;
    seen.add(entry.item.id);
    seen.add(entry.item.url);
    unique.push(entry);
  }
  return unique;
}

/**
 * Latest Headlines. Newest first, with exactly one own-channel video when the
 * feed has any: the newest one. Older own-channel videos are skipped and the
 * next other stories fill the list. If that newest video would land past the
 * last slot, it takes the last slot.
 */
export function latestStories(days: DayFile[], limit = TODAY_STORY_LIMIT): DatedStory[] {
  const all = dedupeNewest(days);
  const newestOwn = all.find((entry) => isOwnChannelItem(entry.item));
  const picked: DatedStory[] = [];
  for (const entry of all) {
    if (isOwnChannelItem(entry.item) && entry.item.id !== newestOwn?.item.id) continue;
    picked.push(entry);
    if (picked.length >= limit) break;
  }
  if (newestOwn && !picked.some((entry) => entry.item.id === newestOwn.item.id)) {
    if (picked.length < limit) picked.push(newestOwn);
    else picked[picked.length - 1] = newestOwn;
  }
  return picked;
}

/** Latest's list. Same rule as latestStories. */
export function recentStories(days: DayFile[], limit = TODAY_STORY_LIMIT): DatedStory[] {
  return latestStories(days, limit);
}

/**
 * Latest first, then every other unique story newest first.
 * Skipped older own-channel videos stay in this list so Search can find them.
 */
export function orderedStories(days: DayFile[]): DatedStory[] {
  const latest = latestStories(days);
  const shown = new Set(latest.map((entry) => entry.item.id));
  const rest = dedupeNewest(days).filter((entry) => !shown.has(entry.item.id));
  return [...latest, ...rest];
}

/**
 * Search's default list: the stories immediately after Latest, at most 50.
 * Same order as orderedStories, so the two screens do not repeat a story.
 */
export function storiesAfterLatest(days: DayFile[]): DatedStory[] {
  return orderedStories(days).slice(TODAY_STORY_LIMIT, TODAY_STORY_LIMIT + SEARCH_AFTER_TODAY_LIMIT);
}
