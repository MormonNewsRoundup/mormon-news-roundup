/**
 * Writes the offline sample feed under fallback/. It is bundled into the app
 * for when the site cannot be reached. It is not copied to GitHub Pages.
 * Running this does not touch feed/, which is the live edition.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feedDir = path.join(root, 'fallback');

const URLS = {
  article: 'https://mormonnewsroundup.org/',
  video: 'https://www.youtube.com/@MormonNewsRoundup',
  podcast: 'https://podcasts.apple.com/us/podcast/mormon-news-roundup/id1617559003',
  tiktok: 'https://www.tiktok.com/search?q=Mormon%20News%20Roundup',
};

function partsInEt(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = Number(part.value);
      return acc;
    }, {});
}

/** UTC instant whose America/New_York clock matches the given calendar time. */
function atEt(isoDate, hour, minute) {
  const [year, month, day] = isoDate.split('-').map(Number);
  let utc = Date.UTC(year, month - 1, day, hour + 5, minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const got = partsInEt(new Date(utc));
    const dayDelta =
      Date.UTC(year, month - 1, day) - Date.UTC(got.year, got.month - 1, got.day);
    const minuteDelta = hour * 60 + minute - (got.hour * 60 + got.minute);
    const delta = dayDelta + minuteDelta * 60 * 1000;
    utc += delta;
    if (delta === 0) break;
  }
  return new Date(utc).toISOString();
}

function item(date, edition, index, spec) {
  const nn = String(index + 1).padStart(2, '0');
  return {
    id: `${date}-${edition}-${nn}`,
    type: spec.type,
    title: spec.title,
    summary: `Sample item, not a real story. ${spec.summary}`,
    source: spec.source,
    url: URLS[spec.type],
    thumbnailUrl: `sample:${spec.thumb}`,
    publishedAt: atEt(date, edition === 'noon' ? 12 : 0, 5 * (index + 1)),
    paywalled: Boolean(spec.paywalled),
    tags: ['sample', spec.type, ...(spec.tags ?? [])],
  };
}

function edition(date, name, specs) {
  return {
    name,
    publishedAt: atEt(date, name === 'noon' ? 12 : 0, 0),
    items: specs.map((spec, index) => item(date, name, index, spec)),
  };
}

const days = [
  {
    date: '2026-10-25',
    editions: [
      edition('2026-10-25', 'noon', [
        {
          type: 'video',
          source: 'Sample Studio',
          thumb: 'video',
          title: 'Sample video: how a YouTube hearing clip is laid out',
          summary:
            'Open it and the YouTube app or site should appear. Nothing in this card happened.',
          tags: ['hearing'],
        },
        {
          type: 'article',
          source: 'Sample Docket',
          thumb: 'court',
          paywalled: true,
          title: 'Sample article: how a paywalled lawsuit card is laid out',
          summary:
            'The lock marks a link that may sit behind a paywall. This is a layout sample, not a case.',
          tags: ['lawsuit', 'court'],
        },
        {
          type: 'tiktok',
          source: 'Sample Clips',
          thumb: 'tiktok',
          title: 'Sample TikTok: how a short clip card is laid out',
          summary: 'A tap hands off to TikTok. The clip itself is not a real post.',
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how a noon audio brief is laid out',
          summary: 'A tap opens the show page in Apple Podcasts. There is no noon episode here.',
        },
      ]),
      edition('2026-10-25', 'midnight', [
        {
          type: 'article',
          source: 'Sample Herald',
          thumb: 'announcement',
          title: 'Sample article: how an official announcement card is laid out',
          summary: 'Major church announcements use this article layout. This one is a placeholder.',
          tags: ['announcement'],
        },
        {
          type: 'article',
          source: 'Sample Docket',
          thumb: 'court',
          paywalled: true,
          title: 'Sample article: how a court filing card is laid out',
          summary: 'Court and Supreme Court items use a source line plus a short summary. Not a real filing.',
          tags: ['court', 'lawsuit'],
        },
        {
          type: 'video',
          source: 'Sample Studio',
          thumb: 'video',
          title: 'Sample video: how a YouTube roundup card is laid out',
          summary: 'Video cards badge the type and open the original YouTube link.',
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how a midnight episode card is laid out',
          summary: 'The midnight edition is the main daily drop. This audio card is only a sample.',
        },
        {
          type: 'tiktok',
          source: 'Sample Clips',
          thumb: 'tiktok',
          title: 'Sample TikTok: how a midnight clip card is laid out',
          summary: 'Short clips sit in the same list as articles. This one does not exist on TikTok.',
        },
        {
          type: 'article',
          source: 'Sample Desk',
          thumb: 'article',
          title: 'Sample article: how an excommunication topic card is laid out',
          summary: 'Topic cards are still just a title, a summary, and a link. No person is named here.',
          tags: ['excommunication'],
        },
        {
          type: 'article',
          source: 'Sample Wire',
          thumb: 'article',
          title: 'Sample article: how a scandal topic card is laid out',
          summary: 'Hard-news cards can cover scandals. This sentence is only showing the layout.',
          tags: ['scandal'],
        },
        {
          type: 'video',
          source: 'Sample Desk',
          thumb: 'announcement',
          title: 'Sample video: how an official statement clip is laid out',
          summary: 'Statement videos use the same card as other YouTube items. This link is the channel home.',
          tags: ['announcement'],
        },
      ]),
    ],
  },
  {
    date: '2026-10-24',
    editions: [
      edition('2026-10-24', 'noon', [
        {
          type: 'article',
          source: 'Sample Herald',
          thumb: 'announcement',
          title: 'Sample article: how a noon announcement card is laid out',
          summary: 'Noon updates are shorter than the midnight edition. This announcement is not real.',
          tags: ['announcement'],
        },
        {
          type: 'video',
          source: 'Sample Studio',
          thumb: 'video',
          title: 'Sample video: how a noon YouTube card is laid out',
          summary: 'Share copies the link plus the words “via Mormon News Roundup”.',
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how a noon show card is laid out',
          summary: 'Podcast cards open Apple Podcasts or the show page, not an in-app player.',
        },
      ]),
      edition('2026-10-24', 'midnight', [
        {
          type: 'article',
          source: 'Sample Docket',
          thumb: 'court',
          paywalled: true,
          title: 'Sample article: how a paywalled court card is laid out',
          summary: 'Another lock icon sample. The underlying link is the public site, not a paywalled paper.',
          tags: ['court'],
        },
        {
          type: 'article',
          source: 'Sample Desk',
          thumb: 'article',
          title: 'Sample article: how a second lawsuit card is laid out',
          summary: 'Search matches this because the title says lawsuit. It is still sample copy.',
          tags: ['lawsuit'],
        },
        {
          type: 'video',
          source: 'Sample Studio',
          thumb: 'video',
          title: 'Sample video: how a hearing clip card is laid out',
          summary: 'Hearing items are videos in this sample. No hearing is being described.',
          tags: ['hearing'],
        },
        {
          type: 'video',
          source: 'Sample Desk',
          thumb: 'video',
          title: 'Sample video: how a statement clip card is laid out',
          summary: 'Two video cards in one edition stack newest first.',
          tags: ['announcement'],
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how an evening episode card is laid out',
          summary: 'Audio items keep a short summary so you can decide before you tap.',
        },
        {
          type: 'tiktok',
          source: 'Sample Clips',
          thumb: 'tiktok',
          title: 'Sample TikTok: how a reaction clip card is laid out',
          summary: 'Filter chips on Search can show only TikToks. This is one of them.',
        },
        {
          type: 'tiktok',
          source: 'Sample Clips',
          thumb: 'tiktok',
          title: 'Sample TikTok: how a follow-up clip card is laid out',
          summary: 'A second short-video card, so the TikTok filter has more than one hit.',
        },
      ]),
    ],
  },
  {
    date: '2026-10-23',
    editions: [
      edition('2026-10-23', 'midnight', [
        {
          type: 'article',
          source: 'Sample Herald',
          thumb: 'announcement',
          title: 'Sample article: how a Friday announcement card is laid out',
          summary: 'This day has no noon update, which is what a quiet afternoon looks like.',
          tags: ['announcement'],
        },
        {
          type: 'article',
          source: 'Sample Docket',
          thumb: 'court',
          title: 'Sample article: how a Friday lawsuit card is laid out',
          summary: 'Lawsuit is in the title so search can find it. There is no lawsuit.',
          tags: ['lawsuit'],
        },
        {
          type: 'article',
          source: 'Sample Wire',
          thumb: 'article',
          paywalled: true,
          title: 'Sample article: how a paywalled scandal card is laid out',
          summary: 'The lock is the only “paywall” here. The summary is placeholder text.',
          tags: ['scandal'],
        },
        {
          type: 'video',
          source: 'Sample Studio',
          thumb: 'video',
          title: 'Sample video: how a Friday YouTube card is laid out',
          summary: 'Older days stay in the archive and load from Today with “Load earlier days”.',
        },
        {
          type: 'video',
          source: 'Sample Desk',
          thumb: 'video',
          title: 'Sample video: how a Friday hearing card is laid out',
          summary: 'Newest items in an edition sort above older ones.',
          tags: ['hearing'],
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how a Friday episode card is laid out',
          summary: 'Podcast search matches the title, the summary, and the source name.',
        },
        {
          type: 'podcast',
          source: 'Sample Studio',
          thumb: 'podcast',
          title: 'Sample podcast: how a bonus audio card is laid out',
          summary: 'A second audio card on a midnight-only day.',
        },
        {
          type: 'tiktok',
          source: 'Sample Clips',
          thumb: 'tiktok',
          title: 'Sample TikTok: how a Friday clip card is laid out',
          summary: 'That is the whole sample archive for this day.',
        },
      ]),
    ],
  },
];

await mkdir(path.join(feedDir, 'days'), { recursive: true });

for (const day of days) {
  const file = {
    date: day.date,
    sample: true,
    editions: day.editions,
  };
  await writeFile(path.join(feedDir, 'days', `${day.date}.json`), `${JSON.stringify(file, null, 2)}\n`);
}

const index = {
  generatedAt: atEt('2026-10-25', 12, 0),
  sample: true,
  days: days.map((day) => day.date),
};

await writeFile(path.join(feedDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

const count = days.reduce(
  (sum, day) => sum + day.editions.reduce((inner, edition) => inner + edition.items.length, 0),
  0,
);
console.log(`Wrote ${days.length} days, ${count} sample items.`);
