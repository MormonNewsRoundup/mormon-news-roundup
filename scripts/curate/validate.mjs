import { fetchText, probeUrl } from './http.mjs';
import { decodeEntities } from './parse-feed.mjs';
import { youtubeId } from './rules.mjs';
import { etDate } from './time.mjs';

function imageOk(contentType, url) {
  if (/text\/html|application\/json/i.test(contentType)) return false;
  if (/^image\//i.test(contentType)) return true;
  if (/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url)) return !contentType || /octet-stream|binary/i.test(contentType);
  return false;
}

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

async function imageProbe(url) {
  if (!url || !url.startsWith('https://')) return '';
  try {
    const probed = await probeUrl(url);
    if (probed.ok && imageOk(probed.contentType, probed.finalUrl || url)) return probed.finalUrl || url;
  } catch {
    return '';
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
  let pageStatus = 0;
  try {
    const probed = await probeUrl(candidate.url);
    pageStatus = probed.status;
    if (!probed.ok) return { ok: false, error: `url returned ${probed.status}` };
  } catch (error) {
    return { ok: false, error: `url failed (${error.message})` };
  }

  let thumbnail = '';
  let paywalled = false;
  if (candidate.type === 'video') {
    const id = candidate.videoId || youtubeId(candidate.url);
    thumbnail = await imageProbe(id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : candidate.thumbnailUrl);
  } else if (candidate.type === 'reddit') {
    thumbnail = '';
  } else {
    thumbnail = await imageProbe(candidate.thumbnailUrl);
    if (!thumbnail || candidate.type === 'article') {
      try {
        const html = await fetchText(candidate.url, { maxBytes: 400_000 });
        paywalled = paywallFromHtml(html);
        const fromPage = ogImageFromHtml(html, candidate.url);
        if (!thumbnail) thumbnail = await imageProbe(fromPage);
      } catch {
        // The range probe already returned 200. An HTML fetch can still fail.
      }
    }
  }
  if (candidate.type !== 'reddit' && !thumbnail) {
    return { ok: false, error: `no https thumbnail (page ${pageStatus})` };
  }
  return {
    ok: true,
    fields: {
      thumbnailUrl: thumbnail,
      paywalled,
      audioUrl: candidate.audioUrl && candidate.audioUrl.startsWith('https://') ? candidate.audioUrl : undefined,
      videoId: candidate.videoId || youtubeId(candidate.url),
    },
  };
}
