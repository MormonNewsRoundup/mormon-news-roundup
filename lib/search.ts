import type { FeedItem, TypeFilter } from '@/lib/types';

/**
 * On-device search. Matches title, summary, and source. Newest first.
 * An empty query keeps every item that passes the type filter.
 */
export function searchItems(items: FeedItem[], query: string, filter: TypeFilter): FeedItem[] {
  const needle = query.trim().toLowerCase();
  return items
    .filter((item) => (filter === 'all' ? true : item.type === filter))
    .filter((item) => {
      if (!needle) return true;
      return (
        item.title.toLowerCase().includes(needle) ||
        item.summary.toLowerCase().includes(needle) ||
        item.source.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      const byTime = b.publishedAt.localeCompare(a.publishedAt);
      if (byTime !== 0) return byTime;
      return b.id.localeCompare(a.id);
    });
}
