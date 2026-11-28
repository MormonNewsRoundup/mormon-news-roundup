/**
 * Source URLs checked on 2026-11-25. Each one returned a feed or a channel
 * document. Notes record the ones that are not the obvious /feed/ address.
 */

const yt = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

export const ARTICLE_SOURCES = [
  {
    id: 'sltrib',
    source: 'The Salt Lake Tribune',
    url: 'https://www.sltrib.com/arc/outboundfeeds/rss/?outputType=xml',
    topic: 'keyword',
    tribune: true,
  },
  {
    id: 'sltrib-religion',
    source: 'The Salt Lake Tribune',
    url: 'https://www.sltrib.com/arc/outboundfeeds/rss/category/religion/?outputType=xml',
    topic: 'keyword',
    tribune: true,
  },
  {
    id: 'rns-lds',
    source: 'Religion News Service',
    url: 'https://religionnews.com/category/beliefs/latter-day-saints/feed/',
    topic: 'outlet',
  },
  {
    id: 'rns',
    source: 'Religion News Service',
    url: 'https://religionnews.com/feed/',
    topic: 'keyword',
  },
  {
    // fox13now.com/feed is 404. The site publishes this RSS document.
    id: 'fox13',
    source: 'Fox 13',
    url: 'https://www.fox13now.com/index.rss',
    topic: 'keyword',
  },
  {
    // eastidahonews.com/feed is blocked by Cloudflare (403) from GitHub runners.
    // Feedburner still serves the same WordPress items.
    id: 'east-idaho',
    source: 'East Idaho News',
    url: 'https://feeds.feedburner.com/EastIdahoNews',
    topic: 'keyword',
  },
  {
    // universe.byu.edu/feed is 404. The homepage advertises index.rss.
    id: 'daily-universe',
    source: 'The Daily Universe',
    url: 'https://universe.byu.edu/index.rss',
    topic: 'keyword',
  },
  {
    id: 'sunstone',
    source: 'Sunstone',
    url: 'https://sunstone.org/feed/',
    topic: 'outlet',
    blog: false,
  },
  {
    id: 'bcc',
    source: 'By Common Consent',
    url: 'https://bycommonconsent.com/feed/',
    topic: 'outlet',
    blog: true,
  },
  {
    id: 'wheat',
    source: 'Wheat & Tares',
    url: 'https://wheatandtares.org/feed/',
    topic: 'outlet',
    blog: true,
  },
  {
    id: 'times',
    source: 'Times & Seasons',
    url: 'https://timesandseasons.org/index.php/feed/',
    topic: 'outlet',
    blog: true,
  },
  {
    id: 'dehlin',
    source: 'John Dehlin (Substack)',
    url: 'https://johndehlin.substack.com/feed',
    topic: 'outlet',
    blog: true,
  },
  {
    id: 'newscast-site',
    source: 'The Mormon Newscast',
    url: 'https://mormonnewscast.org/feed/',
    topic: 'outlet',
  },
];

export const YOUTUBE_SOURCES = [
  {
    id: 'yt-own',
    source: 'Mormon News Roundup',
    channelId: 'UCSI97UEpfnr80eWZLOcGJlA',
    ownChannel: true,
  },
  {
    id: 'yt-gu',
    source: 'Generally Unquotable',
    channelId: 'UC85XrFXOO0zR6gpXG0XPL0w',
  },
  {
    id: 'yt-cultural-hall',
    source: 'The Cultural Hall',
    channelId: 'UC1dO0yyzOtDGL7oRflHWQLw',
    culturalHall: true,
  },
  {
    // The Mormon Newscast does not have its own channel. Its videos are posted
    // on Mormon Discussion Inc. Titles that say "Newscast" keep that source name.
    id: 'yt-newscast',
    source: 'Mormon Discussion Inc.',
    channelId: 'UC5n_8_6j00PSeju0hu2CFXQ',
  },
  {
    id: 'yt-mormonish',
    source: 'Mormonish Podcast',
    channelId: 'UCD71coYl-mS5LIBPPikICsA',
  },
  {
    id: 'yt-sunstone',
    source: 'Sunstone',
    channelId: 'UC6w5td2zzdxGVIxcttdd8Aw',
  },
  {
    id: 'yt-mormon-stories',
    source: 'Mormon Stories Podcast',
    channelId: 'UCx6OgmoqJbOVRq-Lv1P7SzA',
  },
];

export const PODCAST_SOURCES = [
  {
    id: 'pod-mormon-land',
    source: 'Mormon Land',
    url: 'https://feed.podbean.com/mormonland/feed.xml',
    tribune: true,
  },
  {
    id: 'pod-sunstone',
    source: 'Sunstone',
    url: 'https://sunstone.org/feed/podcast/',
  },
  {
    id: 'pod-sunstone-history',
    source: 'Sunstone',
    url: 'https://sunstone.org/feed/podcast/sunstone-history/',
  },
  {
    id: 'pod-rfm',
    source: 'Radio Free Mormon',
    url: 'https://radiofreemormon.org/feed/',
  },
  {
    id: 'pod-md',
    source: 'Mormon Discussions',
    url: 'https://mormondiscussionpodcast.org/feed/',
  },
  {
    id: 'pod-radiowest',
    source: 'RadioWest',
    url: 'https://radiowest.kuer.org/podcast/radiowest/rss.xml',
    topic: 'keyword',
  },
  {
    id: 'pod-newscast',
    source: 'The Mormon Newscast',
    url: 'https://feeds.captivate.fm/the-mormon-newscast-mo/',
  },
  {
    id: 'pod-mormon-stories',
    source: 'Mormon Stories Podcast',
    url: 'https://anchor.fm/s/f7ccb224/podcast/rss',
  },
  {
    id: 'pod-mormonish',
    source: 'Mormonish Podcast',
    url: 'https://feeds.captivate.fm/mormonish/',
  },
  {
    id: 'pod-twil',
    source: 'This Week in Latter-days',
    url: 'https://feeds.podcastmirror.com/this-week-in-mormons-2',
  },
];

export const GOOGLE_NEWS_QUERIES = [
  'Latter-day Saints',
  'Mormon',
  '"LDS church"',
  'BYU',
  'FLDS',
  '"Ensign Peak"',
  '"temple" (protest OR opposition OR zoning) (LDS OR Mormon OR "Latter-day")',
];

export function googleNewsUrl(query) {
  const params = new URLSearchParams({
    q: query,
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export const REDDIT_SUBS = ['exmormon', 'mormon'];

export function redditListingUrl(subreddit, listing) {
  if (listing === 'top') {
    return `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=25&raw_json=1`;
  }
  return `https://www.reddit.com/r/${subreddit}/hot.json?limit=25&raw_json=1`;
}

export function youtubeFeedUrl(channelId) {
  return yt(channelId);
}

export const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
export const TEXT_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.5-flash';

/**
 * gemini-2.5-flash-image is the image model the owner named. Google's pricing
 * page lists its free tier as "Not available" (checked 2026-11-25). The same
 * page lists gemini-3.1-flash-image and gemini-3.1-flash-lite-image the same
 * way, and gemini-2.5-flash-image shuts down 2027-03-15. The call still uses
 * this model with GEMINI_API_KEY. GEMINI_IMAGE_MODEL overrides it.
 */
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export function pagesImage(folder, id) {
  return `https://mormonnewsroundup.github.io/mormon-news-roundup/feed/images/${folder}/${id}.jpg`;
}

export const PAGES_REDDIT_IMAGE = (id) => pagesImage('reddit', id);

export const PAGES_CARD_IMAGE = (id) => pagesImage('cards', id);

export const PAGES_FALLBACK_IMAGE = (type) => pagesImage('fallback', type);
