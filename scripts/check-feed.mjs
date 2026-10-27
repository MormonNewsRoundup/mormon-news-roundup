/**
 * Checks feed/index.json and feed/days/*.json against FEED_SCHEMA.md.
 * Usage: npm run check-feed
 */
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feedDir = path.join(root, 'feed');
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function etDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function etHour(iso) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  return Number(parts.find((part) => part.type === 'hour')?.value);
}

const index = JSON.parse(await readFile(path.join(feedDir, 'index.json'), 'utf8'));
if (!isObject(index)) fail('index.json must be an object');
if (typeof index.generatedAt !== 'string' || Number.isNaN(Date.parse(index.generatedAt))) {
  fail('index.generatedAt must be an ISO date string');
}
if (!Array.isArray(index.days) || index.days.length === 0) fail('index.days must be a non-empty array');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const seenDates = new Set();
for (let i = 0; i < (index.days ?? []).length; i += 1) {
  const date = index.days[i];
  if (typeof date !== 'string' || !datePattern.test(date)) {
    fail(`index.days[${i}] must be YYYY-MM-DD`);
    continue;
  }
  if (seenDates.has(date)) fail(`duplicate day in index: ${date}`);
  seenDates.add(date);
  if (i > 0 && date >= index.days[i - 1]) {
    fail(`index.days must be newest first (${date} is not older than ${index.days[i - 1]})`);
  }
}

const dayFiles = (await readdir(path.join(feedDir, 'days'))).filter((name) => name.endsWith('.json'));
for (const file of dayFiles) {
  const date = file.replace(/\.json$/, '');
  if (!seenDates.has(date)) fail(`${file} is not listed in index.json`);
}

const types = new Set(['article', 'video', 'podcast', 'reddit']);

function isRedditPermalink(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (host !== 'reddit.com' && !host.endsWith('.reddit.com')) return false;
  return /\/comments\/[a-z0-9]+/i.test(url.pathname);
}

// The public image URL is not live until this commit is deployed, so a picture
// hosted with the feed is checked against the file in this repo.
const PAGES_IMAGE_ROOT = '/mormon-news-roundup/feed/images/';

function repoImageFile(thumb) {
  let url;
  try {
    url = new URL(thumb);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'mormonnewsroundup.github.io') return null;
  if (!url.pathname.startsWith(PAGES_IMAGE_ROOT)) return null;
  let relative;
  try {
    relative = decodeURIComponent(url.pathname.slice(PAGES_IMAGE_ROOT.length));
  } catch {
    return { error: 'unreadable path' };
  }
  const parts = relative.split('/');
  if (!relative || parts.some((part) => part === '' || part === '.' || part === '..')) {
    return { error: 'path must stay inside feed/images/' };
  }
  return { relative: `feed/images/${relative}`, file: path.join(feedDir, 'images', ...parts) };
}
const ids = new Set();
let paywalled = 0;
let itemCount = 0;
const titles = [];

for (const date of index.days ?? []) {
  if (typeof date !== 'string') continue;
  let day;
  try {
    day = JSON.parse(await readFile(path.join(feedDir, 'days', `${date}.json`), 'utf8'));
  } catch {
    fail(`missing feed/days/${date}.json`);
    continue;
  }
  if (!isObject(day)) {
    fail(`${date} must be an object`);
    continue;
  }
  if (day.date !== date) fail(`${date}.json date field is ${day.date}`);
  if (!Array.isArray(day.editions) || day.editions.length === 0) {
    fail(`${date} needs at least one edition`);
    continue;
  }
  const editionNames = new Set();
  for (const edition of day.editions) {
    if (!isObject(edition)) {
      fail(`${date} has an edition that is not an object`);
      continue;
    }
    if (edition.name !== 'midnight' && edition.name !== 'noon') {
      fail(`${date} edition name must be midnight or noon`);
    }
    if (editionNames.has(edition.name)) fail(`${date} has two ${edition.name} editions`);
    editionNames.add(edition.name);
    if (etDate(edition.publishedAt) !== date) {
      fail(`${date} ${edition.name} publishedAt must fall on that Eastern Time date`);
    }
    const hour = etHour(edition.publishedAt);
    if (edition.name === 'midnight' && hour !== 0) {
      fail(`${date} midnight edition should publish at 12:00 a.m. Eastern`);
    }
    if (edition.name === 'noon' && hour !== 12) {
      fail(`${date} noon edition should publish at 12:00 p.m. Eastern`);
    }
    if (!Array.isArray(edition.items)) {
      fail(`${date} ${edition.name} items must be an array`);
      continue;
    }
    for (const entry of edition.items) {
      itemCount += 1;
      const label = entry?.id ?? '(missing id)';
      if (!isObject(entry)) {
        fail(`${date} has an item that is not an object`);
        continue;
      }
      for (const key of ['id', 'type', 'title', 'summary', 'source', 'url', 'publishedAt']) {
        if (typeof entry[key] !== 'string' || entry[key].trim() === '') {
          fail(`${label} is missing ${key}`);
        }
      }
      if (typeof entry.paywalled !== 'boolean') fail(`${label} paywalled must be true or false`);
      if ('satire' in entry && typeof entry.satire !== 'boolean') {
        fail(`${label} satire must be true or false when present`);
      }
      if ('subreddit' in entry && (typeof entry.subreddit !== 'string' || entry.subreddit.trim() === '')) {
        fail(`${label} subreddit must be a non-empty string when present`);
      }
      if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== 'string')) {
        fail(`${label} tags must be an array of strings`);
      }
      if (!types.has(entry.type)) fail(`${label} type is not article, video, podcast, or reddit`);
      if (ids.has(entry.id)) fail(`duplicate id ${entry.id}`);
      ids.add(entry.id);
      if (!/^https?:\/\//.test(entry.url ?? '')) fail(`${label} url must be http(s)`);
      if (entry.type === 'reddit' && !isRedditPermalink(entry.url)) {
        fail(`${label} url must be a reddit.com post permalink`);
      }
      const thumb = typeof entry.thumbnailUrl === 'string' ? entry.thumbnailUrl.trim() : '';
      const thumbMissing = entry.thumbnailUrl == null || thumb === '';
      const redditWithoutImage = entry.type === 'reddit' && thumbMissing;
      if (entry.type !== 'reddit' && thumbMissing) {
        fail(`${label} is missing thumbnailUrl`);
      } else if (entry.type === 'reddit' && !thumbMissing && typeof entry.thumbnailUrl !== 'string') {
        fail(`${label} thumbnailUrl must be a string when present`);
      } else if (!redditWithoutImage) {
        if (index.sample) {
          if (!/^https?:\/\//.test(thumb) && !/^sample:[a-z0-9-]+$/.test(thumb)) {
            fail(`${label} thumbnailUrl must be an https image or a sample: token`);
          }
        } else if (!/^https:\/\//.test(thumb)) {
          fail(`${label} thumbnailUrl must be an https image URL`);
        }
        const localImage = repoImageFile(thumb);
        if (localImage?.error) {
          fail(`${label} thumbnailUrl ${localImage.error}`);
        } else if (localImage) {
          try {
            await access(localImage.file);
          } catch {
            fail(`${label} thumbnailUrl points at ${localImage.relative}, which is not in the repo`);
          }
        }
      }
      if (etDate(entry.publishedAt) !== date) {
        fail(`${label} publishedAt must fall on ${date} in Eastern Time`);
      }
      if (entry.paywalled) paywalled += 1;
      if (index.sample) {
        if (!/sample/i.test(entry.title ?? '') || !/sample/i.test(entry.summary ?? '')) {
          fail(`${label} is in a sample feed but does not say Sample in the title and summary`);
        }
      }
      titles.push(entry.title ?? '');
    }
  }
}

// A real day can be short, and it does not have to include every format.
// These stay visible so a curator can see them, and they do not block a push.
if (itemCount < 8) warn(`only ${itemCount} items; a full day is often 8–12`);
if (index.sample && paywalled < 1) {
  warn('sample archive has no paywalled item, so the lock icon is not previewed');
}

const presentTypes = new Set();
for (const date of index.days ?? []) {
  try {
    const day = JSON.parse(await readFile(path.join(feedDir, 'days', `${date}.json`), 'utf8'));
    for (const edition of day.editions ?? []) {
      for (const entry of edition.items ?? []) presentTypes.add(entry.type);
    }
  } catch {
    // already reported
  }
}
if (!presentTypes.has('podcast')) warn('no podcast item in this feed');
const lawsuitHits = titles.filter((title) => /lawsuit/i.test(title));
if (lawsuitHits.length < 2) warn('fewer than two titles mention lawsuit');

if (warnings.length) {
  console.warn(`Feed warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`Feed check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Feed OK: ${index.days.length} days, ${itemCount} items, ${paywalled} paywalled.`);
