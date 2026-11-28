import { fetchText, isYouTubeShort, mapPool } from './http.mjs';
import { resolveGoogleNewsUrl } from './google-news.mjs';
import { parseFeed } from './parse-feed.mjs';
import {
  TOPIC_RE,
  canonicalUrl,
  culturalHallIsNews,
  isGenericSports,
  isShoppingPost,
  stripPublisherSuffix,
  isBlog,
  isChurch,
  isOwnChannel,
  isSatire,
  isShortUrl,
  isTribune,
  refreshFlags,
  scoreCandidate,
  showKeyFor,
  youtubeId,
} from './rules.mjs';
import { etDate, previousDate } from './time.mjs';
import {
  ARTICLE_SOURCES,
  GOOGLE_NEWS_QUERIES,
  PODCAST_SOURCES,
  REDDIT_SUBS,
  YOUTUBE_SOURCES,
  googleNewsUrl,
  redditListingUrl,
  youtubeFeedUrl,
} from './sources.mjs';

function inWindow(iso, date, edition) {
  const day = etDate(iso);
  if (!day) return false;
  if (day === date) return true;
  return edition === 'midnight' && day === previousDate(date);
}

function baseCandidate(raw, meta) {
  const videoId = raw.videoId || youtubeId(raw.url);
  let source = meta.source;
  const title = raw.title || '';
  if (/newscast/i.test(title) && /mormon discussion/i.test(source)) source = 'The Mormon Newscast';
  if (/radio free mormon/i.test(`${title} ${(raw.categories || []).join(' ')}`)) source = 'Radio Free Mormon';
  if (raw.sourceName && meta.googleNews) source = raw.sourceName;
  const show = showKeyFor(source, raw.url, title);
  const ownChannel = Boolean(meta.ownChannel) || isOwnChannel(source, raw.url, show);
  const culturalHall = Boolean(meta.culturalHall) || show === 'cultural-hall';
  const item = {
    type: meta.type,
    title,
    url: raw.url,
    source,
    publishedAt: raw.publishedAt,
    description: raw.description || '',
    thumbnailUrl: raw.thumbnailUrl || '',
    rssImages: raw.rssImages || [],
    audioUrl: raw.audioUrl || '',
    videoId,
    categories: raw.categories || [],
    show,
    ownChannel,
    short: isShortUrl(raw.url, title),
    generallyUnquotable: show === 'generally-unquotable',
    culturalHall,
    culturalHallNews: culturalHall ? culturalHallIsNews(title, raw.description || '') : false,
    church: isChurch(source, raw.url),
    tribune: Boolean(meta.tribune) || isTribune(source, raw.url, show),
    blog: Boolean(meta.blog) || isBlog(source, raw.url, false),
    satire: isSatire(source, raw.url),
    subreddit: meta.subreddit || '',
    newsy: Boolean(raw.newsy),
    score: 0,
    major: false,
    googleNews: Boolean(meta.googleNews),
  };
  item.title = stripPublisherSuffix(item.title, source);
  item.score = scoreCandidate(item);
  if (item.ownChannel) item.satire = false;
  return item;
}

function acceptTopic(meta, item) {
  if (meta.topic !== 'keyword') return true;
  return TOPIC_RE.test(`${item.title} ${item.description}`);
}

async function readFeed(meta) {
  const xml = await fetchText(meta.url);
  return parseFeed(xml)
    .slice(0, 12)
    .map((entry) => baseCandidate(entry, meta))
    .filter((item) => item.publishedAt && acceptTopic(meta, item));
}

function redditPosts(payload, subreddit) {
  const children = payload?.data?.children || [];
  const posts = [];
  for (const child of children) {
    const data = child?.data;
    if (!data || data.stickied || data.over_18 || data.removed_by_category) continue;
    const flair = `${data.link_flair_text || ''} ${data.title || ''}`;
    if (/\b(meme|shitpost|nsfw|porn|nude|onlyfans)\b/i.test(flair)) continue;
    if (/^(my |update: my )/i.test(data.title || '') || /\bmy (bishop|mom|dad|wife|husband|kid|son|daughter)\b/i.test(data.title || '')) {
      continue;
    }
    if (typeof data.permalink !== 'string' || !data.permalink.includes('/comments/')) continue;
    const domain = data.domain || '';
    const newsy = data.is_self === false && domain && !/reddit\.com|redd\.it|imgur\.com/i.test(domain);
    posts.push(
      baseCandidate(
        {
          title: data.title,
          url: `https://www.reddit.com${data.permalink}`,
          publishedAt: new Date(data.created_utc * 1000).toISOString(),
          description: String(data.selftext || '').slice(0, 600),
          newsy,
        },
        { type: 'reddit', source: `r/${subreddit}`, subreddit: `r/${subreddit}`, topic: 'outlet' },
      ),
    );
  }
  posts.sort((a, b) => Number(b.newsy) - Number(a.newsy) || (b.score || 0) - (a.score || 0));
  return posts;
}

async function markOwnShorts(items) {
  const pending = items.filter((item) => item.ownChannel && !item.short && item.videoId).slice(0, 8);
  await mapPool(pending, 3, async (item) => {
    try {
      item.short = await isYouTubeShort(item.videoId);
      if (item.short) item.url = `https://www.youtube.com/shorts/${item.videoId}`;
    } catch {
      // A failed Shorts check leaves the long-form preference in place.
    }
  });
}

export async function gatherCandidates({
  edition,
  date,
  allowReddit = true,
  googleNewsLimit = 12,
  resolveNews = resolveGoogleNewsUrl,
} = {}) {
  const warnings = [];
  const jobs = [
    ...ARTICLE_SOURCES.map((source) => ({ ...source, type: 'article' })),
    ...YOUTUBE_SOURCES.map((source) => ({
      ...source,
      type: 'video',
      url: youtubeFeedUrl(source.channelId),
      topic: 'outlet',
    })),
    ...PODCAST_SOURCES.map((source) => ({ ...source, type: 'podcast', topic: source.topic || 'outlet' })),
    ...GOOGLE_NEWS_QUERIES.map((query) => ({
      id: `gnews-${query}`,
      type: 'article',
      source: 'Google News',
      url: googleNewsUrl(query),
      topic: 'keyword',
      googleNews: true,
    })),
  ];

  const batches = await mapPool(jobs, 6, async (job) => {
    try {
      return await readFeed(job);
    } catch (error) {
      warnings.push(`${job.id}: ${error.message}`);
      return [];
    }
  });

  let candidates = batches.flat().filter((item) => inWindow(item.publishedAt, date, edition));
  if (allowReddit) {
    const listings = REDDIT_SUBS.flatMap((subreddit) =>
      ['top', 'hot'].map((listing) => ({ subreddit, listing, url: redditListingUrl(subreddit, listing) })),
    );
    const redditBatches = await mapPool(listings, 2, async (listing) => {
      try {
        const body = await fetchText(listing.url, { headers: { accept: 'application/json' } });
        return redditPosts(JSON.parse(body), listing.subreddit);
      } catch (error) {
        warnings.push(`reddit r/${listing.subreddit} ${listing.listing}.json: ${error.message}`);
        return [];
      }
    });
    candidates.push(...redditBatches.flat().filter((item) => inWindow(item.publishedAt, date, edition)));
  } else {
    warnings.push('Reddit items are off because CURATE_REDDIT_IMAGES is disabled.');
  }

  const seen = new Set();
  candidates = candidates.filter((item) => {
    if (item.culturalHall && !item.culturalHallNews) return false;
    if (isGenericSports(item) || isShoppingPost(item)) return false;
    const key = canonicalUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const news = candidates
    .filter((item) => item.googleNews)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, googleNewsLimit);
  let resolved = 0;
  await mapPool(news, 3, async (item) => {
    try {
      const url = await resolveNews(item.url);
      if (!url) {
        item.drop = true;
        return;
      }
      item.url = url;
      Object.assign(item, refreshFlags(item));
      item.title = stripPublisherSuffix(item.title, item.source);
      item.googleNews = false;
      if (isGenericSports(item) || isShoppingPost(item)) {
        item.drop = true;
        return;
      }
      if (!TOPIC_RE.test(`${item.title} ${item.description} ${item.source}`)) {
        item.drop = true;
        return;
      }
      resolved += 1;
    } catch (error) {
      warnings.push(`google news: ${error.message}`);
      item.drop = true;
    }
  });
  if (news.length) warnings.push(`Google News resolved ${resolved} of ${news.length} article URLs.`);
  candidates = candidates.filter((item) => !item.drop && !item.googleNews);

  const deduped = [];
  const urls = new Set();
  for (const item of candidates) {
    const key = canonicalUrl(item.url);
    if (urls.has(key)) continue;
    urls.add(key);
    deduped.push(item);
  }
  await markOwnShorts(deduped);
  deduped.forEach((item, index) => {
    item.candidateId = `c${index + 1}`;
  });
  return { candidates: deduped, warnings };
}
