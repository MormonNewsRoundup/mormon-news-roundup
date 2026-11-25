import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { gatherCandidates } from './curate/gather.mjs';
import { resolveGoogleNewsUrl } from './curate/google-news.mjs';
import { toFeedJpeg } from './curate/images.mjs';
import { parseFeed } from './curate/parse-feed.mjs';
import { toFeedItem, withDate } from './curate/publish.mjs';
import {
  blockedShowsFrom,
  chooseItems,
  redditImagesEnabled,
  rejectionReason,
  templateSummary,
  usableSummary,
} from './curate/rules.mjs';
import { attachRedditImages, curate } from './curate/run.mjs';
import { editionsToPublish } from './curate/publish.mjs';
import { parseSelectionText } from './curate/gemini.mjs';
import { descriptionSummary, isGenericSports, stripPublisherSuffix } from './curate/rules.mjs';
import { editionDue, editionPublishedAt, etDate } from './curate/time.mjs';
import { ogImageFromHtml, paywallFromHtml } from './curate/validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function candidate(overrides) {
  return {
    candidateId: overrides.candidateId || overrides.title,
    type: 'article',
    title: 'A church finance story',
    url: `https://example.com/${overrides.candidateId || overrides.title}`,
    source: 'Example News',
    publishedAt: '2026-11-24T15:00:00.000Z',
    description: 'Details from the source.',
    show: 'example news',
    ownChannel: false,
    short: false,
    generallyUnquotable: false,
    culturalHall: false,
    culturalHallNews: false,
    church: false,
    tribune: false,
    blog: false,
    satire: false,
    subreddit: '',
    newsy: false,
    score: 3,
    ...overrides,
  };
}

const openCaps = { blockedShows: new Set(), allowReddit: true, satireAllowed: true };

test('Eastern Time schedule covers both EST and EDT', () => {
  assert.equal(editionPublishedAt('2026-11-25', 'midnight'), '2026-11-25T05:00:00.000Z');
  assert.equal(editionPublishedAt('2026-11-25', 'noon'), '2026-11-25T17:00:00.000Z');
  assert.equal(editionPublishedAt('2026-07-15', 'midnight'), '2026-07-15T04:00:00.000Z');
  assert.equal(editionPublishedAt('2026-07-15', 'noon'), '2026-07-15T16:00:00.000Z');

  assert.deepEqual(editionDue(new Date('2026-11-25T05:20:00.000Z')), { edition: 'midnight', date: '2026-11-25' });
  assert.deepEqual(editionDue(new Date('2026-11-25T14:32:00.000Z')), { edition: 'midnight', date: '2026-11-25' });
  assert.deepEqual(editionDue(new Date('2026-11-25T15:46:00.000Z')), { edition: 'midnight', date: '2026-11-25' });
  assert.deepEqual(editionDue(new Date('2026-11-25T04:20:00.000Z')), { edition: 'noon', date: '2026-11-24' });
  assert.deepEqual(editionDue(new Date('2026-07-15T04:20:00.000Z')), { edition: 'midnight', date: '2026-07-15' });
  assert.deepEqual(editionDue(new Date('2026-07-15T05:20:00.000Z')), { edition: 'midnight', date: '2026-07-15' });
  assert.deepEqual(editionDue(new Date('2026-11-25T17:20:00.000Z')), { edition: 'noon', date: '2026-11-25' });
  assert.deepEqual(editionDue(new Date('2026-07-15T16:20:00.000Z')), { edition: 'noon', date: '2026-07-15' });
  assert.deepEqual(editionDue(new Date('2026-07-15T17:20:00.000Z')), { edition: 'noon', date: '2026-07-15' });
  assert.equal(etDate('2026-11-24T02:30:06.000Z'), '2026-11-23');
  assert.deepEqual(editionsToPublish(null, 'noon'), ['midnight', 'noon']);
  assert.deepEqual(editionsToPublish({ editions: [{ name: 'midnight' }] }, 'noon'), ['noon']);
  assert.deepEqual(editionsToPublish({ editions: [{ name: 'midnight' }, { name: 'noon' }] }, 'noon'), []);
  assert.deepEqual(editionsToPublish({ editions: [{ name: 'midnight' }] }, 'midnight'), []);
});

test('a late runner exits before Gemini when the due edition is already published', async () => {
  const lateMorning = await curate({ now: '2026-11-25T15:46:00.000Z', env: {}, readRoot: root });
  assert.equal(lateMorning.action, 'already-published');
  assert.match(lateMorning.summary, /Not calling Gemini/);
  assert.match(lateMorning.summary, /midnight/);
  const afternoon = await curate({ now: '2026-11-25T18:05:00.000Z', env: {}, readRoot: root });
  assert.equal(afternoon.action, 'already-published');
  assert.match(afternoon.summary, /noon/);
  assert.match(afternoon.summary, /Not calling Gemini/);
  const early = await curate({ now: '2026-11-25T04:20:00.000Z', env: {}, readRoot: root });
  assert.equal(early.action, 'already-published');
  const published = await curate({
    edition: 'noon',
    date: '2026-11-24',
    offline: true,
    readRoot: root,
    now: '2026-11-24T17:20:00.000Z',
  });
  assert.equal(published.action, 'already-published');
  await assert.rejects(
    () => curate({
      edition: 'noon',
      date: '2026-12-01',
      offline: false,
      env: {},
      readRoot: root,
      now: '2026-12-01T17:20:00.000Z',
    }),
    /GEMINI_API_KEY is missing/,
  );
});

test('caps keep one own-channel video, one of each subreddit, and the source limits', () => {
  assert.equal(redditImagesEnabled({}), true);
  assert.equal(redditImagesEnabled({ CURATE_REDDIT_IMAGES: '0' }), false);

  const pool = [
    candidate({ candidateId: 'short', type: 'video', source: 'Mormon News Roundup', ownChannel: true, short: true, show: 'own-channel', url: 'https://www.youtube.com/shorts/aaa', title: 'Short take' }),
    candidate({ candidateId: 'long', type: 'video', source: 'Mormon News Roundup', ownChannel: true, short: false, show: 'own-channel', url: 'https://www.youtube.com/watch?v=bbb', title: 'Nightly episode' }),
    candidate({ candidateId: 'gu1', type: 'video', source: 'Generally Unquotable', generallyUnquotable: true, show: 'generally-unquotable', title: 'First GU' }),
    candidate({ candidateId: 'gu2', type: 'video', source: 'Generally Unquotable', generallyUnquotable: true, show: 'generally-unquotable', title: 'Second GU' }),
    candidate({ candidateId: 'ex1', type: 'reddit', source: 'r/exmormon', subreddit: 'r/exmormon', newsy: true, title: 'Lawsuit thread', url: 'https://www.reddit.com/r/exmormon/comments/aaa111/lawsuit/' }),
    candidate({ candidateId: 'ex2', type: 'reddit', source: 'r/exmormon', subreddit: 'r/exmormon', title: 'Another thread', url: 'https://www.reddit.com/r/exmormon/comments/bbb222/another/' }),
    candidate({ candidateId: 'mo', type: 'reddit', source: 'r/mormon', subreddit: 'r/mormon', newsy: true, title: 'Policy thread', url: 'https://www.reddit.com/r/mormon/comments/ccc333/policy/' }),
    candidate({ candidateId: 'land', type: 'podcast', source: 'Mormon Land', tribune: true, show: 'mormon-land', title: 'Mormon Land interview' }),
    candidate({ candidateId: 'trib1', source: 'The Salt Lake Tribune', tribune: true, title: 'Tribune lawsuit one' }),
    candidate({ candidateId: 'trib2', source: 'The Salt Lake Tribune', tribune: true, title: 'Tribune lawsuit two' }),
    candidate({ candidateId: 'trib3', source: 'The Salt Lake Tribune', tribune: true, title: 'Tribune lawsuit three' }),
    candidate({ candidateId: 'blog1', blog: true, source: 'By Common Consent', show: 'by-common-consent', title: 'A consent essay' }),
    candidate({ candidateId: 'blog2', blog: true, source: 'Wheat & Tares', show: 'wheat-and-tares', title: 'A wheat essay' }),
    candidate({ candidateId: 'blog3', blog: true, source: 'Times & Seasons', show: 'times-and-seasons', title: 'A seasons essay' }),
    candidate({ candidateId: 'bee', satire: true, source: 'The Babylon Bee', title: 'Bee headline' }),
    candidate({ candidateId: 'bee2', satire: true, source: 'The Babylon Bee', title: 'Second bee' }),
    candidate({ candidateId: 'church1', church: true, source: 'Deseret News', title: 'Church notes one' }),
    candidate({ candidateId: 'church2', church: true, source: 'KSL', title: 'Church notes two' }),
    candidate({ candidateId: 'church3', church: true, source: 'Church News', title: 'Church notes three' }),
    candidate({ candidateId: 'church4', church: true, source: 'Church News', title: 'Major lawsuit against the church', major: true, description: 'A lawsuit was filed.' }),
    candidate({ candidateId: 'pod', type: 'podcast', source: 'Radio Free Mormon', show: 'radio-free-mormon', title: 'Hotline lawyer' }),
    candidate({ candidateId: 'hall', type: 'podcast', source: 'The Cultural Hall', culturalHall: true, culturalHallNews: false, show: 'cultural-hall', title: 'Old history chat' }),
  ];
  const chosen = chooseItems(pool, [], openCaps);
  const ids = chosen.map((item) => item.candidateId);
  assert.equal(chosen.filter((item) => item.ownChannel).length, 1);
  assert.equal(chosen.find((item) => item.ownChannel).candidateId, 'long');
  assert.equal(chosen.filter((item) => item.generallyUnquotable).length, 1);
  assert.equal(chosen.filter((item) => item.subreddit === 'r/exmormon').length, 1);
  assert.equal(chosen.filter((item) => item.subreddit === 'r/mormon').length, 1);
  assert.ok(chosen.filter((item) => item.tribune).length <= 3);
  assert.ok(chosen.filter((item) => item.blog).length <= 2);
  assert.ok(chosen.filter((item) => item.satire).length <= 1);
  assert.ok(chosen.filter((item) => item.church).length <= 4);
  assert.equal(ids.includes('hall'), false);
  assert.equal(chosen.filter((item) => item.ownChannel && item.satire).length, 0);

  const blocked = blockedShowsFrom([
    candidate({ type: 'podcast', source: 'Mormon Stories Podcast', show: 'mormon-stories', publishedAt: '2026-11-23T20:00:00.000Z' }),
  ]);
  assert.equal(
    rejectionReason(
      candidate({ type: 'video', source: 'Mormon Stories Podcast', show: 'mormon-stories', title: 'A later episode' }),
      [],
      [],
      { ...openCaps, blockedShows: blocked },
    ),
    'repeat-show',
  );
  assert.equal(
    rejectionReason(
      candidate({ type: 'video', source: 'Mormon News Roundup', ownChannel: true, show: 'own-channel', title: 'Tonight episode' }),
      [candidate({ type: 'video', source: 'Mormon News Roundup', ownChannel: true, show: 'own-channel', publishedAt: '2026-11-23T20:00:00.000Z' })],
      [],
      { ...openCaps, blockedShows: blocked },
    ),
    'own-channel-cap',
  );
});

test('one show per edition, sports stay out, and descriptions replace templates', () => {
  const own = candidate({
    candidateId: 'own',
    type: 'video',
    source: 'Mormon News Roundup',
    ownChannel: true,
    show: 'own-channel',
    title: 'Nightly episode',
  });
  const headlines = [
    'Lawsuit over tithing receipts',
    'Excommunication of a mission president',
    'Temple zoning protest in Fairview',
    'Ensign Peak investment disclosure',
    'Abuse hotline recording released',
    'Honor code investigation findings',
    'Apostle statement about garments',
    'Settlement memo from the law firm',
  ];
  const articles = headlines.map((title, index) => candidate({
    candidateId: `article-${index}`,
    type: 'article',
    source: `Outlet ${index}`,
    show: `outlet-${index}`,
    title,
  }));
  const chosen = chooseItems([
    candidate({ candidateId: 'md1', type: 'podcast', source: 'Mormon Discussions', show: 'mormon-discussions', title: 'Court hearing on the trademark case' }),
    candidate({ candidateId: 'md2', type: 'podcast', source: 'Mormon Discussion Inc.', show: 'mormon-discussions', title: 'Glenn Beck and the on-air apology' }),
    ...articles,
  ], [own], { ...openCaps, editionName: 'noon' });
  assert.equal(chosen.filter((item) => item.show === 'mormon-discussions').length, 1);

  const thin = chooseItems([
    candidate({ candidateId: 'only1', type: 'podcast', source: 'Mormon Discussions', show: 'mormon-discussions', title: 'Trademark hearing about the church filing' }),
    candidate({ candidateId: 'only2', type: 'podcast', source: 'Mormon Discussions', show: 'mormon-discussions', title: 'Separate interview about an apostle apology' }),
  ], [own], { ...openCaps, editionName: 'noon' });
  assert.equal(thin.filter((item) => item.show === 'mormon-discussions').length, 2);

  assert.equal(isGenericSports({ title: 'CFP Chair Groups BYU in 4 Team Debate', description: '' }), true);
  assert.equal(isGenericSports({ title: 'Week 13 picks: BYU cover and betting trends', description: '' }), true);
  assert.equal(isGenericSports({ title: 'BYU honor code football scandal leads to a lawsuit', description: '' }), false);
  assert.equal(stripPublisherSuffix('Temple Square is open for Christmas - LDS Living', 'LDS Living'), 'Temple Square is open for Christmas');
  const fromDescription = descriptionSummary(candidate({
    source: 'The Salt Lake Tribune',
    title: 'Judge questions a trademark filing - The Salt Lake Tribune',
    description: 'The Salt Lake Tribune says a federal judge questioned the church trademark filing.',
  }));
  assert.match(fromDescription, /federal judge questioned/);
  assert.doesNotMatch(fromDescription, /discusses|reports Judge/);
});

test('Gemini selection text keeps fenced JSON', () => {
  const parsed = parseSelectionText('```json\n{"items":[{"candidateId":"c1","summary":"The Salt Lake Tribune says a judge questioned the filing.","major":false}]}\n```');
  assert.equal(parsed.items[0].candidateId, 'c1');
  assert.equal(parsed.items[0].major, false);
});

test('summaries name the source and drop time-of-day wording', () => {
  const article = candidate({ source: 'The Salt Lake Tribune', title: 'Temple lawsuit proceeds this morning' });
  const summary = templateSummary(article);
  assert.match(summary, /Salt Lake Tribune/);
  assert.doesNotMatch(summary, /morning/i);
  assert.equal(usableSummary('This morning the Tribune said something happened in court and more.', article).includes('morning'), false);
  const reddit = candidate({ type: 'reddit', source: 'r/exmormon', subreddit: 'r/exmormon', title: 'Leaders hid a report' });
  assert.match(templateSummary(reddit), /^An r\/exmormon post claims /);
  const blog = candidate({ blog: true, source: 'By Common Consent', title: 'The ban was a policy' });
  assert.match(templateSummary(blog), /By Common Consent/);
  assert.match(templateSummary(blog), /argues/);
});

test('rss parsing ignores links buried in the article html', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title><![CDATA[BYU lawsuit &amp; appeal]]></title>
      <link>https://www.fox13now.com/news/byu-lawsuit</link>
      <pubDate>Tue, 24 Nov 2026 18:00:00 +0000</pubDate>
      <description><![CDATA[Fox 13 reports the suit.]]></description>
      <content:encoded><![CDATA[<link rel="canonical" href="https://example.com/decoy">]]></content:encoded>
      <media:content url="https://cdn.example.com/photo.jpg" type="image/jpeg" />
    </item>
  </channel></rss>`;
  const [item] = parseFeed(xml);
  assert.equal(item.url, 'https://www.fox13now.com/news/byu-lawsuit');
  assert.equal(item.title, 'BYU lawsuit & appeal');
  assert.equal(item.thumbnailUrl, 'https://cdn.example.com/photo.jpg');
  assert.equal(item.publishedAt, '2026-11-24T18:00:00.000Z');
});

test('google news resolver reads the publisher URL from the signature response', async () => {
  const html = '<div data-n-a-id="ART" data-n-a-ts="123" data-n-a-sg="sig"></div>';
  const body = `)]}'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.sltrib.com/religion/2026/11/24/story/\\",1]"]`;
  const fetchImpl = async (url, options = {}) => {
    if (options.method === 'POST') return { ok: true, text: async () => body };
    return { ok: true, text: async () => html };
  };
  const resolved = await resolveGoogleNewsUrl('https://news.google.com/rss/articles/ART', fetchImpl);
  assert.equal(resolved, 'https://www.sltrib.com/religion/2026/11/24/story/');
});

test('page metadata supplies an https image and the paywall flag', () => {
  const html = `
    <meta property="og:image" content="https://cdn.example.com/story.jpg" />
    <meta name="isAccessibleForFree" content="false" />
  `;
  assert.equal(ogImageFromHtml(html, 'https://example.com/story'), 'https://cdn.example.com/story.jpg');
  assert.equal(paywallFromHtml(html), true);
  assert.equal(paywallFromHtml('<div class="paywall-article"></div>'), true);
});

test('reddit cards do not keep a Reddit preview image', () => {
  const feed = toFeedItem({
    id: '2026-11-25-noon-02',
    type: 'reddit',
    title: 'Thread',
    summary: 'An r/exmormon post claims the thread.',
    source: 'r/exmormon',
    url: 'https://www.reddit.com/r/exmormon/comments/abc123/thread/',
    publishedAt: '2026-11-25T16:00:00.000Z',
    paywalled: false,
    thumbnailUrl: 'https://preview.redd.it/example.jpg',
    subreddit: 'r/exmormon',
    tags: [],
  });
  assert.equal(feed.thumbnailUrl, undefined);
  assert.equal(feed.subreddit, 'r/exmormon');
  const index = withDate({ generatedAt: 'x', sample: false, days: ['2026-11-24'], pinned: null }, '2026-11-25', '2026-11-25T17:00:00.000Z');
  assert.equal(index.pinned, null);
  assert.deepEqual(index.days.slice(0, 2), ['2026-11-25', '2026-11-24']);
});

test('a failed Gemini image drops the Reddit item and does not keep a preview', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'mnr-reddit-'));
  const warnings = [];
  try {
    const kept = await attachRedditImages(
      [
        {
          id: '2026-11-25-noon-01',
          type: 'article',
          title: 'Story',
          summary: 'The Salt Lake Tribune reports a lawsuit.',
          source: 'The Salt Lake Tribune',
          url: 'https://www.sltrib.com/story',
          thumbnailUrl: 'https://www.sltrib.com/photo.jpg',
        },
        {
          id: '2026-11-25-noon-02',
          type: 'reddit',
          title: 'Thread',
          summary: 'An r/exmormon post claims the thread.',
          source: 'r/exmormon',
          url: 'https://www.reddit.com/r/exmormon/comments/abc123/thread/',
          thumbnailUrl: 'https://preview.redd.it/preview.jpg',
          subreddit: 'r/exmormon',
        },
      ],
      { writeRoot: tmp, generateImage: async () => null, dryRun: false, warnings },
    );
    assert.deepEqual(kept.map((item) => item.type), ['article']);
    assert.match(warnings.join('\n'), /image generation failed/);
    assert.equal(kept.some((item) => /redd\.it/.test(item.thumbnailUrl || '')), false);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('ffmpeg writes a 1280x720 jpeg under 300 KB', async () => {
  const png = await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'color=c=0x336699:s=640x640', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ${code}`))));
  });
  const jpeg = await toFeedJpeg(png);
  assert.ok(jpeg.length < 300 * 1024);
  assert.equal(jpeg[0], 0xff);
  assert.equal(jpeg[1], 0xd8);
});

test('live sources, stub selection, validation, and file writing', { timeout: 180_000 }, async () => {
  const gathered = await gatherCandidates({
    edition: 'midnight',
    date: '2026-11-24',
    allowReddit: false,
    googleNewsLimit: 2,
  });
  const sources = new Set(gathered.candidates.map((item) => item.source));
  assert.ok(gathered.candidates.length > 8, `only ${gathered.candidates.length} candidates: ${gathered.warnings.join(' | ')}`);
  assert.ok(sources.has('Mormon News Roundup'), `own channel missing. sources: ${[...sources].join(', ')}`);
  assert.ok(
    ['The Salt Lake Tribune', 'Religion News Service', 'Fox 13', 'East Idaho News', 'The Daily Universe'].some((name) => sources.has(name)),
    `news outlets missing: ${[...sources].join(', ')}`,
  );
  assert.ok(gathered.candidates.some((item) => item.type === 'podcast'), 'no podcast candidate');
  assert.ok(gathered.candidates.some((item) => item.type === 'video' && !item.ownChannel), 'no outside video');

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'mnr-curate-'));
  try {
    await mkdir(path.join(tmp, 'feed', 'days'), { recursive: true });
    const index = JSON.parse(await readFile(path.join(root, 'feed', 'index.json'), 'utf8'));
    index.days = index.days.filter((day) => day !== '2026-11-24');
    index.pinned = { id: 'keep-me', date: '2026-11-23' };
    await writeFile(path.join(tmp, 'feed', 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    for (const day of index.days) {
      await writeFile(
        path.join(tmp, 'feed', 'days', `${day}.json`),
        await readFile(path.join(root, 'feed', 'days', `${day}.json`)),
      );
    }
    const result = await curate({
      readRoot: tmp,
      writeRoot: tmp,
      offline: true,
      edition: 'midnight',
      date: '2026-11-24',
      now: '2026-11-24T05:20:00.000Z',
      allowReddit: false,
      googleNewsLimit: 2,
      env: { CURATE_REDDIT_IMAGES: '0' },
    });
    assert.equal(result.action, 'published', result.summary);
    const day = JSON.parse(await readFile(path.join(tmp, 'feed', 'days', '2026-11-24.json'), 'utf8'));
    const writtenIndex = JSON.parse(await readFile(path.join(tmp, 'feed', 'index.json'), 'utf8'));
    assert.equal(writtenIndex.pinned.id, 'keep-me');
    assert.equal(writtenIndex.days[0], '2026-11-25');
    assert.ok(writtenIndex.days.includes('2026-11-24'));
    const items = day.editions.flatMap((edition) => edition.items);
    assert.equal(day.editions.filter((edition) => edition.name === 'midnight').length, 1);
    assert.equal(day.editions[0].publishedAt, '2026-11-24T05:00:00.000Z');
    assert.equal(items.filter((item) => item.source === 'Mormon News Roundup').length, 1);
    assert.equal(items.some((item) => item.satire && item.source === 'Mormon News Roundup'), false);
    assert.ok(items.filter((item) => item.source === 'The Salt Lake Tribune' || item.source === 'Mormon Land').length <= 3);
    assert.ok(items.filter((item) => item.source === 'Generally Unquotable').length <= 1);
    assert.ok(items.every((item) => item.id.startsWith('2026-11-24-midnight-')));
    assert.ok(items.every((item) => etDate(item.publishedAt) === '2026-11-24'));
    assert.ok(items.filter((item) => item.type !== 'reddit').every((item) => item.thumbnailUrl.startsWith('https://')));
    assert.equal(items.some((item) => /redd\.it|preview\.redd/.test(item.thumbnailUrl || '')), false);
    const repoStatus = await new Promise((resolve, reject) => {
      const child = spawn('git', ['status', '--porcelain', '--', 'feed'], { cwd: root });
      let out = '';
      child.stdout.on('data', (chunk) => {
        out += chunk;
      });
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out))));
    });
    assert.equal(repoStatus.trim(), '');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
