import { router, type Href } from 'expo-router';

import type { FeedItem } from '@/lib/types';
import { getDay, getIndex } from '@/lib/feed';

const memory = new Map<string, FeedItem>();

export function rememberStory(item: FeedItem): void {
  memory.set(item.id, item);
}

export function rememberedStory(id: string): FeedItem | null {
  return memory.get(id) ?? null;
}

export function openStory(item: FeedItem): void {
  rememberStory(item);
  router.push(`/story/${item.id}` as Href);
}

/** Saved copies and the cached feed. A saved story opens with no network. */
export async function findStory(id: string): Promise<FeedItem | null> {
  const known = memory.get(id);
  if (known) return known;
  try {
    const index = await getIndex(false);
    for (const date of index.days) {
      try {
        const day = await getDay(date, false);
        for (const edition of day.editions) {
          const item = edition.items.find((entry) => entry.id === id);
          if (item) {
            memory.set(id, item);
            return item;
          }
        }
      } catch {
        // One missing day should not hide a story that lives in another file.
      }
    }
  } catch {
    return null;
  }
  return null;
}
