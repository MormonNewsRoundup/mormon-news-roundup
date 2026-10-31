import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cappedSubreddit,
  isGenerallyUnquotableItem,
  isOwnChannelItem,
  latestStories,
  orderedStories,
  SEARCH_AFTER_TODAY_LIMIT,
  storiesAfterLatest,
  TODAY_STORY_LIMIT,
} from '../lib/today.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function story(id, publishedAt, source, type = 'video', extra = {}) {
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
      ...extra,
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

  const archive = orderedStories(days);
  for (const subreddit of ['exmormon', 'mormon']) {
    const group = archive.filter((entry) => cappedSubreddit(entry.item) === subreddit);
    const shown = latest.filter((entry) => cappedSubreddit(entry.item) === subreddit);
    assert.ok(shown.length <= 1, `${subreddit} appears ${shown.length} times`);
    if (group.length === 0) continue;
    const newest = [...group].sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt))[0];
    if (shown.length === 1) {
      assert.equal(shown[0].item.id, newest.item.id);
      console.log(`Latest r/${subreddit}: ${shown[0].item.id} ${shown[0].item.title}`);
    }
    for (const older of group) {
      if (older.item.id === newest.item.id) continue;
      assert.equal(latest.some((entry) => entry.item.id === older.item.id), false);
      assert.equal(archive.some((entry) => entry.item.id === older.item.id), true);
    }
  }

  const guAll = archive.filter((entry) => isGenerallyUnquotableItem(entry.item));
  const guShown = latest.filter((entry) => isGenerallyUnquotableItem(entry.item));
  assert.ok(guShown.length <= 1);
  if (guAll.length > 0) {
    const newestGu = [...guAll].sort((a, b) => b.item.publishedAt.localeCompare(a.item.publishedAt))[0];
    if (guShown.length === 1) {
      assert.equal(guShown[0].item.id, newestGu.item.id);
      console.log(`Latest Generally Unquotable: ${guShown[0].item.id} ${guShown[0].item.title}`);
    }
    for (const older of guAll) {
      if (older.item.id === newestGu.item.id) continue;
      assert.equal(latest.some((entry) => entry.item.id === older.item.id), false);
      assert.equal(archive.some((entry) => entry.item.id === older.item.id), true);
    }
  }

  const olderOwn = allOwn.filter((entry) => entry.item.id !== newest.item.id);
  const ordered = orderedStories(days);
  const after = storiesAfterLatest(days);
  const searchEnd = TODAY_STORY_LIMIT + SEARCH_AFTER_TODAY_LIMIT;
  for (const entry of olderOwn) {
    assert.equal(latest.some((shown) => shown.item.id === entry.item.id), false);
    const index = ordered.findIndex((shown) => shown.item.id === entry.item.id);
    assert.ok(index >= TODAY_STORY_LIMIT, `${entry.item.id} should stay in the archive after Latest`);
    // Default Search is the next 50 stories. Older own-channel videos inside
    // that window must be listed there. Past it, they stay searchable in the archive.
    if (index < searchEnd) {
      assert.equal(after.some((shown) => shown.item.id === entry.item.id), true);
    }
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

test('older posts from the same subreddit are skipped and the list backfills', () => {
  const reddit = (id, publishedAt, name) =>
    story(id, publishedAt, `r/${name}`, 'reddit', {
      subreddit: `r/${name}`,
      url: `https://www.reddit.com/r/${name}/comments/${id}/post/`,
    }).item;
  const days = [
    day('2026-10-28', [
      reddit('ex-new', '2026-10-28T15:00:00.000Z', 'exmormon'),
      reddit('mo-new', '2026-10-28T14:00:00.000Z', 'mormon'),
      reddit('ex-old', '2026-10-28T13:00:00.000Z', 'exmormon'),
      story('filler', '2026-10-28T12:00:00.000Z', 'KSL', 'article').item,
      reddit('mo-old', '2026-10-28T11:00:00.000Z', 'mormon'),
    ]),
  ];
  const latest = latestStories(days, 3);
  assert.deepEqual(
    latest.map((entry) => entry.item.id),
    ['ex-new', 'mo-new', 'filler'],
  );
  const archive = orderedStories(days);
  for (const id of ['ex-old', 'mo-old']) {
    assert.equal(latest.some((entry) => entry.item.id === id), false);
    assert.ok(archive.findIndex((entry) => entry.item.id === id) >= 3);
  }
});

test('an older Generally Unquotable video is skipped and the list backfills', () => {
  const days = [
    day('2026-10-28', [
      story('gu-new', '2026-10-28T16:00:00.000Z', 'Generally Unquotable').item,
      story('gu-old', '2026-10-28T12:00:00.000Z', 'generally unquotable').item,
      story('other', '2026-10-28T11:00:00.000Z', 'KSL', 'article').item,
    ]),
  ];
  const latest = latestStories(days, 2);
  assert.deepEqual(
    latest.map((entry) => entry.item.id),
    ['gu-new', 'other'],
  );
  const archive = orderedStories(days);
  assert.equal(latest.some((entry) => entry.item.id === 'gu-old'), false);
  assert.ok(archive.findIndex((entry) => entry.item.id === 'gu-old') >= 2);
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
