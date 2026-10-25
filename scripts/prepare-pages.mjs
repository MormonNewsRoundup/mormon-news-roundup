/**
 * Finish an `expo export --platform web` so GitHub Pages can host it.
 *
 * Copies feed/ to dist/feed, adds the SPA fallback and .nojekyll, and checks
 * that JavaScript URLs include the project subpath.
 *
 * Usage: node scripts/prepare-pages.mjs
 */
import { copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const basePath = '/mormon-news-roundup';

const indexPath = path.join(dist, 'index.html');
let html = await readFile(indexPath, 'utf8');

if (!html.includes(`${basePath}/_expo/`)) {
  console.error(
    `dist/index.html does not reference ${basePath}/_expo/. ` +
      'Set expo.experiments.baseUrl in app.json to that path and export again.',
  );
  process.exit(1);
}

if (!html.includes('apple-mobile-web-app-capable')) {
  const tags = `
    <meta name="description" content="Your morning Mormon news, already sorted." />
    <meta name="theme-color" content="#1D1838" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Mormon News" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="${basePath}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${basePath}/apple-touch-icon.png" />
`;
  html = html.replace('</head>', `${tags}</head>`);
  await writeFile(indexPath, html);
}

await cp(path.join(root, 'feed'), path.join(dist, 'feed'), { recursive: true });
await copyFile(indexPath, path.join(dist, '404.html'));
await writeFile(path.join(dist, '.nojekyll'), '');

const feedIndex = JSON.parse(await readFile(path.join(dist, 'feed', 'index.json'), 'utf8'));
if (!Array.isArray(feedIndex.days) || feedIndex.days.length === 0) {
  console.error('dist/feed/index.json has no days.');
  process.exit(1);
}

console.log(`Pages bundle ready. Feed days: ${feedIndex.days.join(', ')}`);
