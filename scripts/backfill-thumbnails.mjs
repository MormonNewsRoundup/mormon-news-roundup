/**
 * Replace icon-sized thumbnails in the last 14 feed days.
 * Keeps every other field. Does not rewrite the index.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchText } from './curate/http.mjs';
import { mapPool } from './curate/http.mjs';
import { chooseThumbnail, inspectImage, looksLikeIcon, youtubeThumbId } from './curate/thumbnails.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cutoff = '2026-11-14';

const index = JSON.parse(await readFile(path.join(root, 'feed', 'index.json'), 'utf8'));
const stats = { replaced: [], removed: [], kept: 0 };

for (const date of index.days) {
  if (date < cutoff) continue;
  const file = path.join(root, 'feed', 'days', `${date}.json`);
  const day = JSON.parse(await readFile(file, 'utf8'));
  const items = day.editions.flatMap((edition) => edition.items);
  let changed = false;
  await mapPool(items, 4, async (item) => {
    const current = typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl.trim() : '';
    if (!current) {
      stats.kept += 1;
      return;
    }
    const inspected = await inspectImage(current);
    if (inspected.status === 'ok') {
      stats.kept += 1;
      return;
    }
    if (inspected.status === 'unknown' && !looksLikeIcon(current)) {
      stats.kept += 1;
      return;
    }
    let html = '';
    if (item.type !== 'video') {
      try {
        html = await fetchText(item.url, { maxBytes: 400_000 });
      } catch {
        html = '';
      }
    }
    let next = '';
    for (let attempt = 0; attempt < 2 && !next; attempt += 1) {
      if (attempt > 0) {
        try {
          html = item.type === 'video' ? '' : await fetchText(item.url, { maxBytes: 400_000 });
        } catch {
          html = '';
        }
      }
      next = await chooseThumbnail({
        html,
        pageUrl: item.url,
        rssImages: [],
        videoId: item.type === 'video' ? youtubeThumbId(item.url) : '',
      });
    }
    if (next && next !== current) {
      item.thumbnailUrl = next;
      stats.replaced.push(item.id);
      changed = true;
      return;
    }
    delete item.thumbnailUrl;
    stats.removed.push(item.id);
    changed = true;
  });
  if (changed) await writeFile(file, `${JSON.stringify(day, null, 2)}\n`);
}

console.log(JSON.stringify({
  replaced: stats.replaced.length,
  removed: stats.removed.length,
  kept: stats.kept,
  replacedIds: stats.replaced,
  removedIds: stats.removed,
}, null, 2));
