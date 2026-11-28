/**
 * Generate pictures for recent items that only have a brand card.
 * Uses GEMINI_API_KEY the same way Reddit images do. Never prints the key.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { geminiImage, requireGeminiKey } from './curate/gemini.mjs';
import { toFeedJpeg } from './curate/images.mjs';
import { PAGES_CARD_IMAGE, PAGES_FALLBACK_IMAGE } from './curate/sources.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cutoff = process.env.FILL_SINCE || '2026-11-15';

const index = JSON.parse(await readFile(path.join(root, 'feed', 'index.json'), 'utf8'));
const apiKey = requireGeminiKey();
const updated = [];

for (const date of index.days) {
  if (date < cutoff) continue;
  const file = path.join(root, 'feed', 'days', `${date}.json`);
  const day = JSON.parse(await readFile(file, 'utf8'));
  let changed = false;
  for (const edition of day.editions || []) {
    for (const item of edition.items || []) {
      const current = typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : '';
      const fallback = current.includes('/feed/images/fallback/');
      if (current && !fallback) continue;
      try {
        const bytes = await geminiImage({ apiKey, item });
        if (!bytes) throw new Error('the image model returned no image');
        const jpeg = await toFeedJpeg(bytes);
        const relative = path.join('feed', 'images', 'cards', `${item.id}.jpg`);
        const dest = path.join(root, relative);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, jpeg);
        item.thumbnailUrl = PAGES_CARD_IMAGE(item.id);
        updated.push(item.id);
        changed = true;
        console.log(`generated ${item.id}`);
      } catch (error) {
        const message = String(error.message || error).replace(/AIza[0-9A-Za-z_-]{10,}/g, '[redacted]');
        console.log(`fallback ${item.id}: ${message}`);
        if (!current) {
          item.thumbnailUrl = PAGES_FALLBACK_IMAGE(item.type || 'article');
          changed = true;
        }
      }
    }
  }
  if (changed) await writeFile(file, `${JSON.stringify(day, null, 2)}\n`);
}

console.log(JSON.stringify({ updated }, null, 2));
