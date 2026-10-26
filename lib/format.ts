/**
 * Full publish date for a story card, such as "October 23, 2026".
 * Uses the America/New_York calendar day of publishedAt so it matches the
 * day files. The result is the date only: no time and no time zone name.
 */
export function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
