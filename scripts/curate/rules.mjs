import { etDate, etHour, previousDate } from './time.mjs';

export function redditImagesEnabled(env = process.env) {
  const raw = env.CURATE_REDDIT_IMAGES;
  if (raw == null || String(raw).trim() === '') return true;
  return !['0', 'false', 'no', 'off'].includes(String(raw).trim().toLowerCase());
}

export const LIMITS = {
  total: 15,
  articleMax: 7,
  videoMax: 3,
  podcastIdeal: 2,
  podcastMax: 3,
  redditMax: 2,
  church: 3,
  churchMajor: 4,
  tribune: 3,
  blog: 2,
  satire: 1,
};

export const TOPIC_RE =
  /\b(mormons?|lds|latter-day saints?|latter day saints?|church of jesus christ|byu|brigham young|flds|ensign peak|nauvoo|joseph smith|kirton|mcconkie|relief society|salt lake temple|mormon temple|lds temple|ex-?mormon)\b/i;

export const HARD_NEWS_RE =
  /\b(lawsuit|sued|suing|abuse|scandal|excommunicat|ensign peak|farmland|protest|zoning|flds|traffick|assault|charged|indicted|investigation|bankrupt|hotline|cover-?up|\bsec\b|fraud|arrest|sentenc|prison|victim|misconduct|title ix|sexual)\b/i;

const SPORTS_RE =
  /\b(football|basketball|playoff|heisman|coach|touchdown|quarterback|volleyball|soccer|golf|tournament|\bjazz\b)\b/i;

const CULTURAL_HALL_NEWS_RE =
  /\b(lawsuit|sued|abuse|scandal|protest|zoning|excommunicat|ensign peak|investigation|arrested|charged|felony|bankrupt|articles of news|current news|title ix)\b/i;

const TIME_WORDS_RE = /\b(morning|afternoon|evening|tonight|overnight|o'clock|a\.m\.|p\.m\.)\b/i;

const CHURCH_HOSTS = [
  'churchofjesuschrist.org',
  'lds.org',
  'thechurchnews.com',
  'churchnews.com',
  'deseret.com',
  'deseretnews.com',
  'ksl.com',
];

const BLOG_HOSTS = ['bycommonconsent.com', 'wheatandtares.org', 'timesandseasons.org', 'substack.com', 'exponentii.org'];

const SATIRE_RE = /babylon\s*bee|babylonbee\.com|notthebee\.com/i;

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'oc' || key === 'fbclid') parsed.searchParams.delete(key);
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    const query = parsed.searchParams.toString();
    return `${parsed.protocol}//${host}${path}${query ? `?${query}` : ''}`;
  } catch {
    return url;
  }
}

export function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] || '';
    if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || '';
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

export function showKeyFor(source, url, title = '') {
  const blob = `${source} ${url} ${title}`.toLowerCase();
  if (blob.includes('mormon news roundup') || blob.includes('@mormonnewsroundup')) return 'own-channel';
  if (blob.includes('generally unquotable')) return 'generally-unquotable';
  if (blob.includes('cultural hall') || blob.includes('theculturalhall.com')) return 'cultural-hall';
  if (blob.includes('mormon land') || blob.includes('mormonland')) return 'mormon-land';
  if (blob.includes('radio free mormon') || blob.includes('radiofreemormon')) return 'radio-free-mormon';
  if (/mormon discussions?\b|mormondiscussion/.test(blob)) return 'mormon-discussions';
  if (blob.includes('mormon stories') || blob.includes('mormonstories')) return 'mormon-stories';
  if (blob.includes('mormonish')) return 'mormonish';
  if (blob.includes('mormon newscast') || blob.includes('mormonnewscast')) return 'mormon-newscast';
  if (blob.includes('this week in latter')) return 'this-week';
  if (blob.includes('radiowest') || blob.includes('radio west')) return 'radiowest';
  if (blob.includes('sunstone')) return 'sunstone';
  if (blob.includes('by common consent')) return 'by-common-consent';
  if (blob.includes('wheat')) return 'wheat-and-tares';
  if (blob.includes('times & seasons') || blob.includes('times and seasons') || blob.includes('timesandseasons')) {
    return 'times-and-seasons';
  }
  return source.trim().toLowerCase();
}

export function isChurch(source, url) {
  const host = hostOf(url);
  if (CHURCH_HOSTS.some((name) => host === name || host.endsWith(`.${name}`))) return true;
  return /\b(church news|church newsroom|deseret news|ksl)\b/i.test(source);
}

export function isTribune(source, url, show) {
  const host = hostOf(url);
  if (host === 'sltrib.com' || host.endsWith('.sltrib.com')) return true;
  if (show === 'mormon-land') return true;
  return /salt lake tribune|mormon land/i.test(source);
}

export function isBlog(source, url, marked) {
  if (marked) return true;
  const host = hostOf(url);
  if (BLOG_HOSTS.some((name) => host === name || host.endsWith(`.${name}`))) return true;
  return /substack/i.test(source);
}

export function isSatire(source, url) {
  return SATIRE_RE.test(`${source} ${url}`);
}

export function isOwnChannel(source, url, show) {
  if (show === 'own-channel') return true;
  return source.trim() === 'Mormon News Roundup' && /youtube\.com|youtu\.be/.test(url);
}

export function isShortUrl(url, title = '') {
  return /\/shorts\//.test(url) || /#shorts?\b/i.test(title);
}

export function culturalHallIsNews(title, description) {
  return CULTURAL_HALL_NEWS_RE.test(`${title} ${description}`);
}

const GAME_RE =
  /\b(cfp|college football playoff|playoff ranking|heisman|\bodds\b|\bspread\b|betting|sportsbook|game preview|matchup|kickoff|touchdown|quarterback|\bpicks?\b)\b/i;

const CHURCH_ITSELF_RE =
  /\b(honor code|title ix|abuse|scandal|bishop|prophet|apostle|excommunicat|temple|tithing|garment|missionary|lawsuit|sued|church discipline)\b/i;

/** Generic sports and betting. A church scandal that mentions a team still stays. */
export function isGenericSports(item) {
  const blob = `${item.title || ''} ${item.description || ''}`;
  const sportsy = SPORTS_RE.test(blob) || GAME_RE.test(blob);
  if (!sportsy) return false;
  if (CHURCH_ITSELF_RE.test(blob)) return false;
  return true;
}

export function stripPublisherSuffix(title, source = '') {
  let next = String(title || '').replace(/\s+/g, ' ').trim();
  const names = [source, source.replace(/^the /i, '')].filter((name) => name && name.toLowerCase() !== 'google news');
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\s+[-–—]\\s+${escaped}\\s*$`, 'i'), '').trim();
  }
  next = next.replace(/\s+[-–—]\s+(?:[A-Z0-9][\w&.'’]*\s*){1,6}$/, (suffix) => (
    /\b(news|tribune|times|post|journal|herald|press|illustrated|living|dispatch|wire|report|daily|magazine|review|sun|bee|mercury)\b/i.test(suffix)
      ? ''
      : suffix
  )).trim();
  return next;
}

export function scoreCandidate(candidate) {
  const blob = `${candidate.title} ${candidate.description || ''}`;
  let score = 0;
  if (HARD_NEWS_RE.test(blob)) score += 5;
  if (TOPIC_RE.test(blob)) score += 1;
  if (SPORTS_RE.test(blob) && !HARD_NEWS_RE.test(blob)) score -= 3;
  if (/\bbyu\b/i.test(blob) && HARD_NEWS_RE.test(blob)) score += 2;
  if (candidate.newsy) score += 2;
  return score;
}

export function templateSummary(candidate) {
  const title = candidate.title.replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
  const source = candidate.source.trim();
  let text;
  if (candidate.subreddit) {
    text = `An ${candidate.subreddit} post claims ${title}.`;
  } else if (candidate.blog) {
    text = `A ${source} post argues ${title}.`;
  } else if (candidate.type === 'video' || candidate.type === 'podcast') {
    text = `${source} discusses ${title}.`;
  } else {
    text = `${source} reports ${title}.`;
  }
  text = text.replace(TIME_WORDS_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

export function summaryProblems(summary, candidate) {
  const problems = [];
  const text = typeof summary === 'string' ? summary.trim() : '';
  if (text.length < 20 || text.length > 500) problems.push('length');
  const sentences = text.split(/(?<=[.!?])\s+/).filter((part) => part.trim());
  if (sentences.length < 1 || sentences.length > 2) problems.push('sentences');
  if (TIME_WORDS_RE.test(text)) problems.push('time-of-day');
  if (candidate.subreddit) {
    const expected = new RegExp(`^An ${candidate.subreddit} post claims\\b`, 'i');
    if (!expected.test(text)) problems.push('reddit-wording');
  } else if (!namesSource(text, candidate.source)) {
    problems.push('source-name');
  }
  if (candidate.blog && !/\b(argues|writes|says|contends|comments|commentary|post)\b/i.test(text)) {
    problems.push('blog-framing');
  }
  return problems;
}

function namesSource(summary, source) {
  const text = summary.toLowerCase();
  const name = source.toLowerCase().trim();
  if (text.includes(name)) return true;
  const distinctive = name
    .replace(/^the /, '')
    .replace(/\(substack\)/, '')
    .replace(/\b(podcast|news|inc\.?)\b/g, '')
    .trim();
  if (distinctive.length >= 4 && text.includes(distinctive)) return true;
  const token = distinctive.split(/\s+/).find((word) => word.length >= 5);
  return Boolean(token && text.includes(token));
}

function firstSentences(text, count) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, count).join(' ').trim();
}

/** One sentence from the source description. Used when Gemini does not answer. */
export function descriptionSummary(candidate) {
  let text = String(candidate.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(TIME_WORDS_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  if (!text) return '';
  let summary = firstSentences(text, 1);
  if (summary.length < 40) {
    const two = firstSentences(text, 2);
    if (two) summary = two;
  }
  if (summary.length > 320) summary = `${summary.slice(0, 317).replace(/\s+\S*$/, '').trim()}.`;
  if (!/[.!?]$/.test(summary)) summary += '.';
  if (candidate.subreddit) {
    if (!new RegExp(`^An ${candidate.subreddit} post claims\\b`, 'i').test(summary)) {
      summary = `An ${candidate.subreddit} post claims ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
    }
  } else if (!namesSource(summary, candidate.source)) {
    summary = `${candidate.source} reports ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
  }
  if (candidate.blog && !/\b(argues|writes|says|contends|comments|commentary|post)\b/i.test(summary)) {
    summary = summary.replace(/\breports\b/i, 'writes in a post that');
  }
  return summary.replace(/\s{2,}/g, ' ').trim();
}

export function usableSummary(summary, candidate) {
  const offered = typeof summary === 'string' ? summary.trim() : '';
  const attempts = [offered, offered ? firstSentences(offered, 1) : '', descriptionSummary(candidate)];
  for (const attempt of attempts) {
    if (attempt && summaryProblems(attempt, candidate).length === 0) return attempt;
  }
  return '';
}

function tokens(title) {
  const stop = new Set(['with', 'from', 'that', 'this', 'after', 'about', 'their', 'have', 'will', 'says', 'said']);
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stop.has(word)),
  );
}

export function similarTitle(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size < 3 || b.size < 3) return false;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size) >= 0.6;
}

export function countsOf(items) {
  const counts = {
    total: items.length,
    article: 0,
    video: 0,
    podcast: 0,
    reddit: 0,
    church: 0,
    tribune: 0,
    blog: 0,
    satire: 0,
    gu: 0,
    own: 0,
    exmormon: 0,
    mormon: 0,
  };
  for (const item of items) addCount(counts, item);
  counts.total = items.length;
  return counts;
}

function addCount(counts, item) {
  counts[item.type] = (counts[item.type] || 0) + 1;
  if (item.church) counts.church += 1;
  if (item.tribune) counts.tribune += 1;
  if (item.blog) counts.blog += 1;
  if (item.satire) counts.satire += 1;
  if (item.generallyUnquotable) counts.gu += 1;
  if (item.ownChannel) counts.own += 1;
  if (item.subreddit === 'r/exmormon') counts.exmormon += 1;
  if (item.subreddit === 'r/mormon') counts.mormon += 1;
}

function majorEnough(item) {
  return item.major === true && HARD_NEWS_RE.test(`${item.title} ${item.description || ''} ${item.summary || ''}`);
}

export function rejectionReason(candidate, existing, chosen, options = {}) {
  const { blockedShows = new Set(), allowReddit = true, satireAllowed = true } = options;
  if (isGenericSports(candidate)) return 'sports';
  if (candidate.type === 'tiktok' || /tiktok\.com/i.test(candidate.url)) return 'tiktok';
  if (candidate.type === 'reddit' && !allowReddit) return 'reddit-images-off';
  if (candidate.culturalHall && !candidate.culturalHallNews) return 'cultural-hall';
  const combined = [...existing, ...chosen];
  if (combined.some((item) => canonicalUrl(item.url) === canonicalUrl(candidate.url))) return 'duplicate-url';
  if ((candidate.type === 'video' || candidate.type === 'podcast') && !candidate.ownChannel && !options.allowRepeatShow) {
    const editionName = options.editionName;
    const sameEdition = [
      ...existing.filter((item) => !editionName || item.edition === editionName),
      ...chosen,
    ];
    if (sameEdition.some((item) => item.show === candidate.show && (item.type === 'video' || item.type === 'podcast'))) {
      return 'repeat-show';
    }
    if (blockedShows.has(candidate.show)) return 'repeat-show';
  }
  if (candidate.ownChannel && combined.some((item) => item.ownChannel)) return 'own-channel-cap';
  if (candidate.generallyUnquotable && combined.filter((item) => item.generallyUnquotable).length >= 1) return 'gu-cap';
  if (candidate.subreddit === 'r/exmormon' && combined.some((item) => item.subreddit === 'r/exmormon')) return 'subreddit-cap';
  if (candidate.subreddit === 'r/mormon' && combined.some((item) => item.subreddit === 'r/mormon')) return 'subreddit-cap';
  if (candidate.satire && (!satireAllowed || combined.some((item) => item.satire))) return 'satire-cap';
  if (candidate.tribune && combined.filter((item) => item.tribune).length >= LIMITS.tribune) return 'tribune-cap';
  if (candidate.blog && combined.filter((item) => item.blog).length >= LIMITS.blog) return 'blog-cap';
  if (candidate.church) {
    const churchCount = combined.filter((item) => item.church).length;
    const ceiling = majorEnough(candidate) ? LIMITS.churchMajor : LIMITS.church;
    if (churchCount >= ceiling) return 'church-cap';
    if (churchCount >= LIMITS.church && !majorEnough(candidate)) return 'church-cap';
  }
  if (combined.some((item) => similarTitle(item.title, candidate.title))) return 'duplicate-story';
  const counts = countsOf(combined);
  if (counts.total >= LIMITS.total && !candidate.ownChannel) return 'total-cap';
  if (candidate.type === 'article' && counts.article >= LIMITS.articleMax) return 'article-cap';
  if (candidate.type === 'video' && counts.video >= LIMITS.videoMax) return 'video-cap';
  if (candidate.type === 'podcast' && counts.podcast >= LIMITS.podcastMax) return 'podcast-cap';
  if (candidate.type === 'reddit' && counts.reddit >= LIMITS.redditMax) return 'reddit-cap';
  return '';
}

function byPreference(left, right) {
  if (left.ownChannel !== right.ownChannel) return left.ownChannel ? -1 : 1;
  if (left.ownChannel && left.short !== right.short) return left.short ? 1 : -1;
  if (left.newsy !== right.newsy) return left.newsy ? -1 : 1;
  return (right.score || 0) - (left.score || 0) || right.publishedAt.localeCompare(left.publishedAt);
}

/**
 * Code picks the edition. Gemini may supply a preferred id order; anything it
 * skips is still eligible to fill a cap that is under its target.
 */
export function chooseItems(pool, existing, options) {
  const ordered = [...pool].sort(byPreference);
  const preferred = [];
  const seen = new Set();
  for (const id of options.preferredIds || []) {
    const found = ordered.find((item) => item.candidateId === id);
    if (found && !seen.has(found.candidateId)) {
      preferred.push(found);
      seen.add(found.candidateId);
    }
  }
  for (const item of ordered) {
    if (!seen.has(item.candidateId)) preferred.push(item);
  }
  const chosen = [];
  const take = (item, extra = {}) => {
    const churchTwin = chosen.find((entry) => entry.church && !item.church && similarTitle(entry.title, item.title));
    const withoutTwin = churchTwin ? chosen.filter((entry) => entry !== churchTwin) : chosen;
    if (rejectionReason(item, existing, withoutTwin, { ...options, ...extra })) return false;
    if (churchTwin) chosen.splice(chosen.indexOf(churchTwin), 1);
    chosen.push(item);
    return true;
  };

  for (const item of ordered) {
    if (!item.ownChannel) continue;
    if (take(item)) break;
  }

  const need = (type, target) => {
    const have = [...existing, ...chosen].filter((item) => item.type === type).length;
    return Math.max(0, target - have);
  };
  const takeType = (type, target) => {
    let remaining = need(type, target);
    if (remaining <= 0) return;
    for (const item of preferred) {
      if (remaining <= 0) break;
      if (item.type !== type || chosen.includes(item)) continue;
      if (take(item)) remaining -= 1;
    }
  };

  takeType('podcast', LIMITS.podcastIdeal);
  takeType('video', LIMITS.videoMax);
  takeType('article', LIMITS.articleMax);
  if (options.allowReddit) takeType('reddit', LIMITS.redditMax);

  const total = () => existing.length + chosen.length;
  if (total() < 8) {
    for (const item of preferred) {
      if (total() >= 8) break;
      if (item.score < 0 || chosen.includes(item)) continue;
      take(item, { allowRepeatShow: true });
    }
  }
  if (total() < 10) {
    takeType('podcast', LIMITS.podcastMax);
    for (const item of preferred) {
      if (total() >= 10) break;
      if (item.score < 0 || chosen.includes(item)) continue;
      take(item);
    }
  }
  for (const item of preferred) {
    if (total() >= LIMITS.total) break;
    if (item.score < 0 || chosen.includes(item)) continue;
    take(item);
  }
  return chosen;
}

export function blockedShowsFrom(items) {
  const ranked = [...items].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  const shows = new Set();
  for (const item of ranked.slice(0, 20)) {
    if ((item.type === 'video' || item.type === 'podcast') && item.show && !item.ownChannel) shows.add(item.show);
  }
  return shows;
}

export function satireRecently(dayMap, date) {
  const previous = previousDate(date);
  const before = previousDate(previous);
  for (const day of [previous, before]) {
    const file = dayMap.get(day);
    if (!file) continue;
    for (const edition of file.editions || []) {
      for (const item of edition.items || []) {
        if (item.satire === true) return true;
      }
    }
  }
  return false;
}

export function feedItemsOn(dayFile) {
  if (!dayFile) return [];
  const items = [];
  for (const edition of dayFile.editions || []) {
    for (const item of edition.items || []) items.push({ ...item, edition: edition.name });
  }
  return items;
}

export function refreshFlags(item) {
  const show = item.ownChannel ? 'own-channel' : showKeyFor(item.source, item.url, item.title);
  const ownChannel = item.type === 'video' && (item.ownChannel || show === 'own-channel');
  return {
    ...item,
    show: ownChannel ? 'own-channel' : show,
    ownChannel,
    generallyUnquotable: show === 'generally-unquotable' || item.generallyUnquotable === true,
    church: isChurch(item.source, item.url),
    tribune: isTribune(item.source, item.url, ownChannel ? 'own-channel' : show),
    blog: isBlog(item.source, item.url, item.blog === true),
    satire: ownChannel ? false : item.satire === true || isSatire(item.source, item.url),
  };
}

export function annotateFeedItem(item) {
  const show = showKeyFor(item.source || '', item.url || '', item.title || '');
  const ownChannel = item.type === 'video' && (show === 'own-channel' || item.source === 'Mormon News Roundup');
  return {
    ...item,
    show: ownChannel ? 'own-channel' : show,
    ownChannel,
    short: isShortUrl(item.url || '', item.title || ''),
    generallyUnquotable: show === 'generally-unquotable',
    culturalHall: show === 'cultural-hall',
    church: isChurch(item.source || '', item.url || ''),
    tribune: isTribune(item.source || '', item.url || '', show),
    blog: isBlog(item.source || '', item.url || '', false),
    satire: item.satire === true || isSatire(item.source || '', item.url || ''),
    subreddit: item.subreddit || (item.type === 'reddit' ? item.source : ''),
  };
}

export function itemIsLate(iso, day) {
  return etDate(iso) === day && etHour(iso) >= 12;
}

export function onDate(iso, day) {
  return etDate(iso) === day;
}
