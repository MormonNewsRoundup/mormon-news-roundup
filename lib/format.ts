/** Short date for a story card from an ISO timestamp, using the Eastern calendar day. */
export function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return formatCardDate(ymd);
}

/** Short date for a story card, such as "Oct 23". No time and no time zone. */
export function formatCardDate(yyyyMmDd: string): string {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  if (!year || !month || !day) return yyyyMmDd;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
