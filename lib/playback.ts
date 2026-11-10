import type { FeedItem } from '@/lib/types';

export type ResolvedAudio = {
  url: string;
  title: string;
  artist: string;
  artworkUrl?: string;
};

export type AudioResult = { ok: true; audio: ResolvedAudio } | { ok: false; reason: 'missing' | 'error' };

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg)$/i;

export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return id || null;
  }
  if (
    host !== 'youtube.com' &&
    host !== 'm.youtube.com' &&
    host !== 'music.youtube.com' &&
    host !== 'youtube-nocookie.com'
  ) {
    return null;
  }
  if (parsed.pathname === '/watch') {
    const id = parsed.searchParams.get('v');
    return id || null;
  }
  const match = parsed.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function isDirectAudioUrl(url: string): boolean {
  try {
    return AUDIO_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function httpsArtwork(item: FeedItem): string | undefined {
  const thumb = item.thumbnailUrl?.trim() ?? '';
  return thumb.startsWith('https://') ? thumb : undefined;
}

function buzzsproutMp3(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.toLowerCase().endsWith('buzzsprout.com')) return null;
  if (!/\/episodes\/\d+\/?$/.test(parsed.pathname)) return null;
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}.mp3`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.href;
}

type AppleRef = { showId: string; episodeId: string | null };

function applePodcast(url: string): AppleRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'podcasts.apple.com' && host !== 'itunes.apple.com') return null;
  const show = parsed.pathname.match(/\/id(\d+)/);
  if (!show) return null;
  return { showId: show[1], episodeId: parsed.searchParams.get('i') };
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function stripUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    parsed.search = '';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return '';
  }
}

async function fetchText(url: string, accept: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: { Accept: accept }, signal: controller.signal });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ItunesEpisode = { trackId?: number; episodeUrl?: string; feedUrl?: string; kind?: string };

async function lookupAppleAudio(ref: AppleRef, title: string): Promise<string | null> {
  const body = await fetchText(
    `https://itunes.apple.com/lookup?id=${ref.showId}&entity=podcastEpisode&limit=200`,
    'application/json',
  );
  if (!body) return null;
  let results: ItunesEpisode[] = [];
  try {
    const parsed = JSON.parse(body) as { results?: ItunesEpisode[] };
    results = parsed.results ?? [];
  } catch {
    return null;
  }
  if (ref.episodeId) {
    const match = results.find((entry) => String(entry.trackId ?? '') === ref.episodeId && entry.episodeUrl);
    if (match?.episodeUrl) return match.episodeUrl;
  }
  const feedUrl = results.find((entry) => entry.feedUrl)?.feedUrl;
  if (!feedUrl) return null;
  const xml = await fetchText(feedUrl, 'application/rss+xml, application/xml, text/xml');
  if (!xml) return null;
  return matchEnclosure(xml, '', title, ref.episodeId);
}

type RssItem = { title: string; link: string; guid: string; enclosure: string };

function rssItems(xml: string): RssItem[] {
  return xml
    .split(/<item[\s>]/i)
    .slice(1)
    .map((chunk) => {
      const body = chunk.split(/<\/item>/i)[0] ?? chunk;
      const title = decodeXml(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
      const link = decodeXml(body.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '');
      const guid = decodeXml(body.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ?? '');
      const enclosure = decodeXml(body.match(/<enclosure\b[^>]*\burl=["']([^"']+)["']/i)?.[1] ?? '');
      return { title, link, guid, enclosure };
    })
    .filter((item) => item.enclosure.startsWith('http'));
}

function matchEnclosure(xml: string, pageUrl: string, title: string, episodeId: string | null): string | null {
  const page = pageUrl ? stripUrl(pageUrl) : '';
  const wanted = norm(title);
  let fuzzy: string | null = null;
  for (const item of rssItems(xml)) {
    if (episodeId && (item.guid.includes(episodeId) || item.link.includes(episodeId))) return item.enclosure;
    if (page && stripUrl(item.link) === page) return item.enclosure;
    const itemTitle = norm(item.title);
    if (wanted && itemTitle === wanted) return item.enclosure;
    if (
      wanted.length >= 24 &&
      itemTitle.length >= 24 &&
      (itemTitle.includes(wanted) || wanted.includes(itemTitle))
    ) {
      fuzzy = fuzzy ?? item.enclosure;
    }
  }
  return fuzzy;
}

function audioUrlsInHtml(html: string, base: string): string[] {
  const found = new Set<string>();
  const add = (value: string) => {
    try {
      const absolute = new URL(decodeXml(value), base).href;
      if (isDirectAudioUrl(absolute)) found.add(absolute);
    } catch {
      // Ignore a broken media address.
    }
  };
  for (const match of html.matchAll(/<(?:audio|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(match[1]);
  for (const match of html.matchAll(/https?:\/\/[^"'<>\s]+\.(?:mp3|m4a|aac)(?:\?[^"'<>\s]*)?/gi)) add(match[0]);
  return [...found];
}

function rssLink(html: string, base: string): string | null {
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const markup = tag[0];
    if (!/application\/(?:rss|atom)\+xml|application\/podcast/i.test(markup)) continue;
    const href = markup.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      return new URL(decodeXml(href), base).href;
    } catch {
      // Keep looking.
    }
  }
  return null;
}

async function audioFromPage(pageUrl: string, title: string): Promise<string | null> {
  const html = await fetchText(pageUrl, 'text/html');
  if (!html) return null;
  const direct = audioUrlsInHtml(html, pageUrl);
  if (direct.length === 1) return direct[0];
  const rss = rssLink(html, pageUrl);
  if (!rss) return null;
  const xml = await fetchText(rss, 'application/rss+xml, application/xml, text/xml');
  if (!xml) return null;
  return matchEnclosure(xml, pageUrl, title, null);
}

/** Finds a podcast file. YouTube links are played by the embedded player instead. */
export async function resolveAudio(item: FeedItem): Promise<AudioResult> {
  const titled = {
    title: item.title,
    artist: item.source,
    artworkUrl: httpsArtwork(item),
  };
  const explicit = item.audioUrl?.trim() ?? '';
  if (explicit.startsWith('https://') && !youtubeVideoId(explicit)) {
    return { ok: true, audio: { ...titled, url: explicit } };
  }
  if (youtubeVideoId(item.url)) return { ok: false, reason: 'missing' };
  if (isDirectAudioUrl(item.url)) return { ok: true, audio: { ...titled, url: item.url } };
  const buzz = buzzsproutMp3(item.url);
  if (buzz) return { ok: true, audio: { ...titled, url: buzz } };

  try {
    const apple = applePodcast(item.url);
    if (apple) {
      const url = await lookupAppleAudio(apple, item.title);
      return url ? { ok: true, audio: { ...titled, url } } : { ok: false, reason: 'missing' };
    }
    const page = await audioFromPage(item.url, item.title);
    return page ? { ok: true, audio: { ...titled, url: page } } : { ok: false, reason: 'missing' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
