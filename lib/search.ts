import type { FeedItem, TypeFilter } from '@/lib/types';

export type Timeframe = 'any' | 'week' | 'month' | 'year' | 'custom';

export const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'week', label: 'Past week' },
  { id: 'month', label: 'Past month' },
  { id: 'year', label: 'Past year' },
  { id: 'custom', label: 'Custom range' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export type TimeRange = { start: number | null; end: number | null };

function startOfLocalDay(yyyyMmDd: string): number | null {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

function endOfLocalDay(yyyyMmDd: string): number | null {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Inclusive window for a timeframe chip. Custom uses local calendar days. */
export function rangeForTimeframe(timeframe: Timeframe, now: number, from: string, to: string): TimeRange {
  if (timeframe === 'week') return { start: now - 7 * DAY_MS, end: null };
  if (timeframe === 'month') return { start: now - 30 * DAY_MS, end: null };
  if (timeframe === 'year') return { start: now - 365 * DAY_MS, end: null };
  if (timeframe === 'custom') {
    let start = from ? startOfLocalDay(from) : null;
    let end = to ? endOfLocalDay(to) : null;
    if (start != null && end != null && start > end) {
      start = to ? startOfLocalDay(to) : null;
      end = from ? endOfLocalDay(from) : null;
    }
    return { start, end };
  }
  return { start: null, end: null };
}

export function localDateInputValue(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * On-device search. Matches title, summary, and source, then the type and
 * time range. Newest first. An empty query keeps every item that passes.
 */
export function searchItems(
  items: FeedItem[],
  query: string,
  filter: TypeFilter,
  range: TimeRange = { start: null, end: null },
): FeedItem[] {
  const needle = query.trim().toLowerCase();
  return items
    .filter((item) => (filter === 'all' ? true : item.type === filter))
    .filter((item) => {
      const published = Date.parse(item.publishedAt);
      if (!Number.isFinite(published)) return false;
      if (range.start != null && published < range.start) return false;
      if (range.end != null && published > range.end) return false;
      return true;
    })
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
