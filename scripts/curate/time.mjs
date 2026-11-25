/** Eastern Time helpers. Feed dates are America/New_York calendar dates. */

export function etParts(instant) {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minute: Number(get('minute')),
  };
}

export function etDate(instant) {
  return etParts(instant).date;
}

export function etHour(instant) {
  return etParts(instant).hour;
}

/** Previous calendar day for a YYYY-MM-DD string. */
export function previousDate(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * UTC instant for a clock time on an Eastern calendar date.
 * 12:00 a.m. is hour 0. 12:00 p.m. is hour 12.
 */
export function easternInstant(ymd, hour, minute = 0) {
  let utc = Date.parse(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = etParts(new Date(utc));
    const want = Date.parse(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
    const got = Date.parse(
      `${parts.date}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:00.000Z`,
    );
    if (want === got) break;
    utc += want - got;
  }
  return new Date(utc).toISOString();
}

export function editionPublishedAt(ymd, edition) {
  return easternInstant(ymd, edition === 'noon' ? 12 : 0, 0);
}

/**
 * Cron fires at both the EST and EDT hours. Publish only when Eastern Time
 * is actually in the 12:00 a.m. hour or the 12:00 p.m. hour.
 */
export function editionDue(now) {
  const parts = etParts(now);
  if (parts.hour === 0) return { edition: 'midnight', date: parts.date };
  if (parts.hour === 12) return { edition: 'noon', date: parts.date };
  return null;
}

export function formatEditionMessage(ymd, edition) {
  const [year, month, day] = ymd.split('-').map(Number);
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return `Publish the ${monthName} ${day} ${edition} edition.`;
}
