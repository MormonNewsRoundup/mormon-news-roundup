import { BROWSER_UA } from './http.mjs';
import { decodeEntities } from './parse-feed.mjs';
import { youtubeId } from './rules.mjs';

const MIN_WIDTH = 400;

/** Site icons and tiny crops. "nologo" is not a logo. */
export function looksLikeIcon(url) {
  let path = String(url || '');
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    path = String(url || '');
  }
  const lower = path.toLowerCase();
  if (/favicon|site-icon|apple-touch-icon/.test(lower)) return true;
  if (/(^|[^a-z])logo([^a-z]|$)/.test(lower)) return true;
  const cropped = lower.match(/cropped-[^/]*?(\d{1,4})x(\d{1,4})/);
  if (cropped && (Number(cropped[1]) < 300 || Number(cropped[2]) < 300)) return true;
  if (/-(?:32x32|150x150)(?:\.[a-z0-9]+)?$/.test(lower)) return true;
  return false;
}

export function imageSize(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) return jpegSize(buf);
  if (buf.length >= 16 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return webpSize(buf);
  }
  return null;
}

function jpegSize(buf) {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (offset + 4 > buf.length) break;
    const length = buf.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(buf) {
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buf.length >= 30) {
    return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  if (chunk === 'VP8L' && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ' && buf.length >= 30) {
    const start = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
    if (start >= 0 && buf.length >= start + 7) {
      return {
        width: buf.readUInt16LE(start + 3) & 0x3fff,
        height: buf.readUInt16LE(start + 5) & 0x3fff,
      };
    }
  }
  return null;
}

function absoluteUrl(value, pageUrl) {
  if (!value) return '';
  try {
    const url = new URL(decodeEntities(value), pageUrl);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function metaContent(html, kind, name) {
  const patterns = [
    new RegExp(`<meta[^>]+${kind}=["']${name}(?::secure_url|:src)?["'][^>]*content=["']([^"']+)["']`, 'gi'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${kind}=["']${name}(?::secure_url|:src)?["']`, 'gi'),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) return match[1];
  }
  return '';
}

export function pageImages(html, pageUrl) {
  return {
    og: absoluteUrl(metaContent(html, 'property', 'og:image'), pageUrl),
    twitter: absoluteUrl(metaContent(html, 'name', 'twitter:image'), pageUrl),
  };
}

async function fetchImage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': BROWSER_UA, accept: 'image/*,*/*', range: 'bytes=0-524287' },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status !== 200 && response.status !== 206) return null;
  const type = response.headers.get('content-type') || '';
  if (/text\/html|application\/json/i.test(type)) return null;
  const buf = Buffer.from(await response.arrayBuffer());
  return { buf, type, finalUrl: response.url };
}

/** ok, small, icon, or unknown when the file could not be measured. */
export async function inspectImage(url) {
  if (!url || !url.startsWith('https://')) return { status: 'unknown' };
  if (looksLikeIcon(url)) return { status: 'icon' };
  try {
    const image = await fetchImage(url);
    if (!image) return { status: 'unknown' };
    const size = imageSize(image.buf);
    if (!size) return { status: 'unknown' };
    if (size.width < MIN_WIDTH) return { status: 'small', width: size.width };
    return { status: 'ok', url: image.finalUrl.startsWith('https://') ? image.finalUrl : url, width: size.width };
  } catch {
    return { status: 'unknown' };
  }
}

/** True when the file is a real picture at least about 400px wide. */
export async function acceptableImage(url) {
  const inspected = await inspectImage(url);
  return inspected.status === 'ok' ? inspected.url : '';
}

/**
 * og:image, then twitter:image, then the largest RSS image, then YouTube
 * maxres and hq. Icons and pictures under 400px wide are skipped.
 */
export async function chooseThumbnail({ html = '', pageUrl = '', rssImages = [], videoId = '' } = {}) {
  const fromPage = html ? pageImages(html, pageUrl) : { og: '', twitter: '' };
  const rss = [...rssImages]
    .filter((image) => image?.url)
    .sort((left, right) => (right.width || 0) - (left.width || 0));
  const candidates = [
    fromPage.og,
    fromPage.twitter,
    ...rss.map((image) => image.url),
  ];
  if (videoId) {
    candidates.push(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
    candidates.push(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
  }
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    const accepted = await acceptableImage(candidate);
    if (accepted) return accepted;
  }
  return '';
}

export function youtubeThumbId(url) {
  return youtubeId(url);
}
