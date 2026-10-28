import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isOwnChannelItem, latestStories, orderedStories, storiesAfterLatest, TODAY_STORY_LIMIT } from '../lib/today.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function story(id, publishedAt, source, type = 'video') {
  return {
    item: {
      id,
      type,
      title: id,
      summary: id,
      source,
      url: `https://example.com/${id}`,
      publishedAt,
      paywalled: false,
      tags: [],
    },
    date: publishedAt.slice(0, 10),
  };
}

function day(date, items) {
  return {
    date,
    editions: [{ name: 'noon', publishedAt: `${date}T16:00:00.000Z`, items }],
  };
}

async function currentFeedDays() {
  const index = JSON.parse(await readFile(path.join(root, 'feed', 'index.json'), 'utf8'));
  const days = [];
  for (const date of index.days) {
    days.push(JSON.parse(await readFile(path.join(root, 'feed', 'days', `${date}.json`), 'utf8')));
  }
  return days;
}

test('the current feed Latest list has exactly one own-channel video, the newest', async () => {
  const days = await currentFeedDays();
  const latest = latestStories(days);
  const own = latest.filter((entry) => isOwnChannelItem(entry.item));
  assert.equal(latest.length, TODAY_STORY_LIMIT);
  assert.equal(own.length, 1);

  const allOwn = orderedStories(days).filter((entry) => isOwnChannelItem(entry.item));
  assert.ok(allOwn.length >= 1);
  const newest = [...allOwn].sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt))[0];
  assert.equal(own[0].item.id, newest.item.id);
  console.log(`Latest own-channel item: ${own[0].item.id} ${own[0].item.title}`);

  const olderOwn = allOwn.filter((entry) => entry.item.id !== newest.item.id);
  const after = storiesAfterLatest(days);
  for (const entry of olderOwn) {
    assert.equal(latest.some((shown) => shown.item.id === entry.item.id), false);
    assert.equal(
      orderedStories(days).some((shown) => shown.item.id === entry.item.id),
      true,
    );
    assert.equal(after.some((shown) => shown.item.id === entry.item.id), true);
  }
});

test('older own-channel videos are skipped and the list backfills', () => {
  const days = [
    day('2026-10-28', [
      story('own-new', '2026-10-28T04:00:00.000Z', 'Mormon News Roundup').item,
      story('other-a', '2026-10-28T03:00:00.000Z', 'KSL', 'article').item,
    ]),
    day('2026-10-27', [
      story('own-old', '2026-10-27T21:30:00.000Z', 'Mormon News Roundup').item,
      story('other-b', '2026-10-27T20:00:00.000Z', 'KSL', 'article').item,
    ]),
  ];
  const latest = latestStories(days, 3);
  assert.deepEqual(latest.map((entry) => entry.item.id), ['own-new', 'other-a', 'other-b']);
  const archive = orderedStories(days);
  assert.equal(archive.some((entry) => entry.item.id === 'own-old'), true);
  assert.ok(archive.findIndex((entry) => entry.item.id === 'own-old') >= 3);
});

test('an own-channel video older than the first 15 takes the last slot', () => {
  const items = [];
  for (let n = 0; n < 16; n += 1) {
    const hour = String(20 - Math.floor(n / 2)).padStart(2, '0');
    items.push(story(`other-${n}`, `2026-10-28T${hour}:00:00.000Z`, 'KSL', 'article').item);
  }
  items.push(story('own-late', '2026-10-20T12:00:00.000Z', 'Mormon News Roundup').item);
  const latest = latestStories([day('2026-10-28', items.slice(0, 16)), day('2026-10-20', [items[16]])], 15);
  assert.equal(latest.length, 15);
  assert.equal(latest.filter((entry) => isOwnChannelItem(entry.item)).length, 1);
  assert.equal(latest[14].item.id, 'own-late');
  assert.equal(latest.some((entry) => entry.item.id === 'other-14'), false);
  const archive = orderedStories([day('2026-10-28', items.slice(0, 16)), day('2026-10-20', [items[16]])]);
  assert.equal(archive[15].item.id, 'other-14');
});

test('a feed with no own-channel video stays the plain newest 15', () => {
  const items = [];
  for (let n = 0; n < 16; n += 1) {
    items.push(story(`other-${n}`, `2026-10-28T${String(n).padStart(2, '0')}:00:00.000Z`, 'KSL', 'article').item);
  }
  const latest = latestStories([day('2026-10-28', items)]);
  assert.equal(latest.filter((entry) => isOwnChannelItem(entry.item)).length, 0);
  assert.equal(latest[0].item.id, 'other-15');
  assert.equal(latest.length, 15);
});
