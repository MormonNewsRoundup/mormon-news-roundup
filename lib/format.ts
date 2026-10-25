import type { EditionName } from '@/lib/types';

export function formatDayHeading(yyyyMmDd: string): string {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  if (!year || !month || !day) return yyyyMmDd;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatEditionTime(iso: string): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(new Date(iso));
  return formatted.replace('EDT', 'ET').replace('EST', 'ET');
}

export function editionTitle(name: EditionName): string {
  return name === 'noon' ? 'Noon update' : 'Midnight edition';
}
