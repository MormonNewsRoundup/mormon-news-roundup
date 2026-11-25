import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadFeed(root) {
  const index = JSON.parse(await readFile(path.join(root, 'feed', 'index.json'), 'utf8'));
  const days = new Map();
  for (const date of index.days || []) {
    try {
      const day = JSON.parse(await readFile(path.join(root, 'feed', 'days', `${date}.json`), 'utf8'));
      days.set(date, day);
    } catch {
      // check-feed reports a missing day file.
    }
  }
  return { index, days };
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function nextItemNumber(day, editionName) {
  const edition = day?.editions?.find((entry) => entry.name === editionName);
  let max = 0;
  for (const item of edition?.items || []) {
    const match = String(item.id || '').match(/-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

export function editionForLateItems(day) {
  if (!day?.editions?.length) return null;
  if (day.editions.some((entry) => entry.name === 'noon')) return 'noon';
  return 'midnight';
}

export function toFeedItem(item) {
  const tags = item.ownChannel ? ['mormon-news-roundup', 'own-channel'] : Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [];
  const feed = {
    id: item.id,
    type: item.type,
    title: item.title,
    summary: item.summary,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    paywalled: item.paywalled === true,
    tags,
  };
  if (item.type === 'reddit') {
    if (typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.includes('/feed/images/reddit/')) {
      feed.thumbnailUrl = item.thumbnailUrl;
    }
    if (item.subreddit) feed.subreddit = item.subreddit;
  } else {
    feed.thumbnailUrl = item.thumbnailUrl;
  }
  if (item.satire === true && !item.ownChannel) feed.satire = true;
  if (typeof item.audioUrl === 'string' && item.audioUrl.startsWith('https://')) feed.audioUrl = item.audioUrl;
  return feed;
}

export function placeEdition(day, editionName, publishedAt, items) {
  const next = {
    date: day.date,
    sample: day.sample === true,
    editions: (day.editions || []).map((edition) => ({
      ...edition,
      items: [...(edition.items || [])],
    })),
  };
  const found = next.editions.find((edition) => edition.name === editionName);
  if (found) found.items.push(...items);
  else next.editions.push({ name: editionName, publishedAt, items });
  next.editions.sort((left, right) => (left.name === 'noon') - (right.name === 'noon'));
  return next;
}

export function replaceItem(day, id, replacement) {
  const next = {
    date: day.date,
    sample: day.sample === true,
    editions: (day.editions || []).map((edition) => ({
      ...edition,
      items: (edition.items || []).map((item) => (item.id === id ? replacement : item)),
    })),
  };
  return next;
}

export function withDate(index, date, generatedAt) {
  const days = index.days?.includes(date) ? [...index.days] : [date, ...(index.days || [])];
  days.sort((left, right) => right.localeCompare(left));
  return { ...index, generatedAt, days };
}
