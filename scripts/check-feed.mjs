/**
 * Checks feed/index.json and feed/days/*.json against FEED_SCHEMA.md.
 * Usage: npm run check-feed
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feedDir = path.join(root, 'feed');
const errors = [];

function fail(message) {
  errors.push(message);
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

const types = new Set(['article', 'video', 'podcast', 'tiktok']);
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
      for (const key of ['id', 'type', 'title', 'summary', 'source', 'url', 'thumbnailUrl', 'publishedAt']) {
        if (typeof entry[key] !== 'string' || entry[key].trim() === '') {
          fail(`${label} is missing ${key}`);
        }
      }
      if (typeof entry.paywalled !== 'boolean') fail(`${label} paywalled must be true or false`);
      if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== 'string')) {
        fail(`${label} tags must be an array of strings`);
      }
      if (!types.has(entry.type)) fail(`${label} type is not article, video, podcast, or tiktok`);
      if (ids.has(entry.id)) fail(`duplicate id ${entry.id}`);
      ids.add(entry.id);
      if (!/^https?:\/\//.test(entry.url ?? '')) fail(`${label} url must be http(s)`);
      if (!/^https?:\/\//.test(entry.thumbnailUrl ?? '') && !/^sample:[a-z0-9-]+$/.test(entry.thumbnailUrl ?? '')) {
        fail(`${label} thumbnailUrl must be an http(s) URL or a sample: token`);
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

// These extra rules describe the placeholder archive. A real edition only has to
// match the schema above, so a push of ordinary news still deploys.
if (index.sample) {
  if (itemCount < 8) fail('expected a useful sample of at least 8 items');
  if (paywalled < 1) fail('expected at least one paywalled item so the lock icon can be previewed');
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
if (index.sample) {
  for (const type of types) {
    if (!presentTypes.has(type)) fail(`archive is missing a ${type} item`);
  }
  const lawsuitHits = titles.filter((title) => /lawsuit/i.test(title));
  if (lawsuitHits.length < 2) fail('sample search needs more than one lawsuit title');
}

if (errors.length) {
  console.error(`Feed check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Feed OK: ${index.days.length} days, ${itemCount} items, ${paywalled} paywalled.`);
