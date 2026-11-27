import { fetchText, probeUrl } from './http.mjs';
import { decodeEntities } from './parse-feed.mjs';
import { youtubeId } from './rules.mjs';
import { chooseThumbnail } from './thumbnails.mjs';
import { etDate } from './time.mjs';

export function paywallFromHtml(html) {
  return /isAccessibleForFree"\s*:\s*false|isAccessibleForFree"\s+content="false"|c-paywall|paywall-article|subscriber-only|subscribe to (?:read|continue)|available to subscribers only/i.test(
    html,
  );
}

export function ogImageFromHtml(html, pageUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      try {
        const url = new URL(decodeEntities(match[1]), pageUrl);
        if (url.protocol === 'https:') return url.href;
      } catch {
        // try the next tag
      }
    }
  }
  return '';
}

export async function validateCandidate(candidate, date) {
  if (etDate(candidate.publishedAt) !== date) {
    return { ok: false, error: `publishedAt is not on ${date} Eastern` };
  }
  if (candidate.type === 'reddit') {
    let permalink;
    try {
      permalink = new URL(candidate.url);
    } catch {
      return { ok: false, error: 'reddit url is not a permalink' };
    }
    const host = permalink.hostname.toLowerCase();
    if (host !== 'reddit.com' && !host.endsWith('.reddit.com')) return { ok: false, error: 'reddit host' };
    if (!/\/comments\/[a-z0-9]+/i.test(permalink.pathname)) return { ok: false, error: 'reddit permalink' };
  }
  try {
    const probed = await probeUrl(candidate.url);
    if (!probed.ok) return { ok: false, error: `url returned ${probed.status}` };
  } catch (error) {
    return { ok: false, error: `url failed (${error.message})` };
  }

  let html = '';
  let paywalled = false;
  const videoId = candidate.videoId || youtubeId(candidate.url);
  if (candidate.type !== 'reddit') {
    try {
      html = await fetchText(candidate.url, { maxBytes: 400_000 });
      paywalled = paywallFromHtml(html);
    } catch {
      html = '';
    }
  }
  const thumbnail = candidate.type === 'reddit'
    ? ''
    : await chooseThumbnail({
      html,
      pageUrl: candidate.url,
      rssImages: candidate.rssImages || (candidate.thumbnailUrl ? [{ url: candidate.thumbnailUrl, width: 0 }] : []),
      videoId: candidate.type === 'video' ? videoId : '',
    });
  return {
    ok: true,
    fields: {
      thumbnailUrl: thumbnail || undefined,
      paywalled,
      audioUrl: candidate.audioUrl && candidate.audioUrl.startsWith('https://') ? candidate.audioUrl : undefined,
      videoId,
    },
  };
}
