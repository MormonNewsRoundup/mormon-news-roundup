export function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0*39;/g, "'")
    .replace(/&#(\d+);/g, (_, digits) => {
      const code = Number(digits);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanText(raw) {
  if (!raw) return '';
  const wrapped = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  const body = wrapped ? wrapped[1] : raw;
  return decodeEntities(body.replace(/<[^>]+>/g, ' '));
}

function tagBlock(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1] : '';
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? decodeEntities(match[2]) : '';
}

function stripHeavy(xml) {
  return xml
    .replace(/<content:encoded\b[^>]*>[\s\S]*?<\/content:encoded>/gi, '')
    .replace(/<description\b[^>]*>[\s\S]*?<\/description>/gi, '')
    .replace(/<media:description\b[^>]*>[\s\S]*?<\/media:description>/gi, '')
    .replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/gi, '');
}

function absolute(base, value) {
  if (!value) return '';
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

export function listedImages(block, pageUrl) {
  const found = [];
  const tags = block.match(/<(?:media:content|media:thumbnail|itunes:image|enclosure)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const type = attr(tag, 'type');
    const url = attr(tag, 'url') || attr(tag, 'href');
    if (!url) continue;
    const imageType = /image/i.test(type) || /\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url);
    const audio = /audio/i.test(type) || /\.(?:mp3|m4a)(?:$|\?)/i.test(url);
    if (!imageType || audio) continue;
    const declared = Number(attr(tag, 'width')) || 0;
    found.push({ url: absolute(pageUrl, url), width: declared });
  }
  const img = block.match(/<img\b[^>]*\bsrc=(["'])(.*?)\1/i);
  if (img) found.push({ url: absolute(pageUrl, decodeEntities(img[2])), width: 0 });
  return found.filter((image) => image.url);
}

function firstImage(block, pageUrl) {
  const images = listedImages(block, pageUrl);
  images.sort((left, right) => (right.width || 0) - (left.width || 0));
  return images[0]?.url || '';
}

function audioUrl(block) {
  const tags = block.match(/<enclosure\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const url = attr(tag, 'url');
    const type = attr(tag, 'type');
    if (url && (/audio/i.test(type) || /\.(?:mp3|m4a)(?:$|\?)/i.test(url))) return url;
  }
  return '';
}

function parseDate(value) {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toISOString();
}

function rssLink(stripped) {
  const plain = stripped.match(/<link>([^<]+)<\/link>/i);
  if (plain) return decodeEntities(plain[1].trim());
  const href = stripped.match(/<link\b[^>]*href=(["'])(.*?)\1/i);
  return href ? decodeEntities(href[2]) : '';
}

function parseRssItem(block, feed) {
  const title = cleanText(tagBlock(block, 'title'));
  const description = cleanText(tagBlock(block, 'description') || tagBlock(block, 'content:encoded')).slice(0, 700);
  const stripped = stripHeavy(block);
  const link = rssLink(stripped);
  const publishedAt = parseDate(cleanText(tagBlock(stripped, 'pubDate') || tagBlock(stripped, 'dc:date')));
  const sourceTag = stripped.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
  const sourceName = sourceTag ? cleanText(sourceTag[2]) : '';
  const sourceUrl = sourceTag ? attr(sourceTag[0], 'url') : '';
  const categories = [...stripped.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map((match) => cleanText(match[1]));
  return {
    title,
    url: link,
    publishedAt,
    description,
    rssImages: listedImages(stripped, link).concat(feed.channelImage ? [{ url: feed.channelImage, width: 0 }] : []),
    thumbnailUrl: firstImage(stripped, link) || feed.channelImage || '',
    audioUrl: audioUrl(stripped),
    sourceName,
    sourceUrl,
    categories,
    videoId: '',
  };
}

function parseAtomEntry(block) {
  const title = cleanText(tagBlock(block, 'title'));
  const description = cleanText(tagBlock(block, 'media:description')).slice(0, 700);
  const publishedAt = parseDate(cleanText(tagBlock(block, 'published') || tagBlock(block, 'updated')));
  const alternate = block.match(/<link\b[^>]*rel=(["'])alternate\1[^>]*>/i) || block.match(/<link\b[^>]*href=(["'])[^"']+\1[^>]*>/i);
  const url = alternate ? attr(alternate[0], 'href') : '';
  const videoId = cleanText(tagBlock(block, 'yt:videoId'));
  return {
    title,
    url,
    publishedAt,
    description,
    rssImages: listedImages(block, url),
    thumbnailUrl: firstImage(block, url),
    audioUrl: '',
    sourceName: '',
    sourceUrl: '',
    categories: [],
    videoId,
  };
}

export function parseFeed(xml) {
  const text = xml.replace(/^\uFEFF/, '');
  const channelImageMatch = text.match(/<itunes:image\b[^>]*>/i) || text.match(/<image>\s*<url>([^<]+)<\/url>/i);
  const channelImage = channelImageMatch
    ? (attr(channelImageMatch[0], 'href') || cleanText(channelImageMatch[1] || ''))
    : '';
  if (/<entry[\s>]/.test(text) && /<feed[\s>]/.test(text)) {
    const entries = text.split(/<entry[\s>]/).slice(1);
    return entries.map((entry) => parseAtomEntry(`<entry ${entry}`)).filter((item) => item.title && item.url);
  }
  const items = text.split(/<item[\s>]/).slice(1);
  return items
    .map((item) => parseRssItem(`<item ${item}`, { channelImage }))
    .filter((item) => item.title && item.url);
}
