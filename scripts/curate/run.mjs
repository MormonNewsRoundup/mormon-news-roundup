import { spawn } from 'node:child_process';
import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gatherCandidates } from './gather.mjs';
import { geminiImage, geminiSelect, requireGeminiKey, selectionPrompt } from './gemini.mjs';
import { toFeedJpeg } from './images.mjs';
import {
  editionForLateItems,
  loadFeed,
  nextItemNumber,
  placeEdition,
  replaceItem,
  toFeedItem,
  withDate,
  writeJson,
} from './publish.mjs';
import {
  annotateFeedItem,
  blockedShowsFrom,
  canonicalUrl,
  chooseItems,
  feedItemsOn,
  itemIsLate,
  onDate,
  redditImagesEnabled,
  satireRecently,
  usableSummary,
  youtubeId,
} from './rules.mjs';
import { IMAGE_MODEL, PAGES_REDDIT_IMAGE, TEXT_MODEL } from './sources.mjs';
import { editionDue, editionPublishedAt, etDate, etParts, formatEditionMessage, previousDate } from './time.mjs';
import { validateCandidate } from './validate.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function existingSummary(items) {
  if (!items.length) return 'nothing yet';
  return items.map((item) => `${item.type} ${item.source}`).join(', ');
}

async function pickWithGemini(pool, context, warnings) {
  if (!pool.length) return [];
  try {
    const picks = await geminiSelect({
      apiKey: context.apiKey,
      model: context.model,
      prompt: selectionPrompt(pool, context),
    });
    const byId = new Map(picks.map((pick) => [pick.candidateId, pick]));
    for (const item of pool) {
      const pick = byId.get(item.candidateId);
      if (!pick) continue;
      item.modelSummary = pick.summary;
      item.major = pick.major === true && item.church;
    }
    return picks.map((pick) => pick.candidateId);
  } catch (error) {
    if (error.code === 'MISSING_GEMINI_API_KEY' || /rejected GEMINI_API_KEY/.test(error.message)) throw error;
    warnings.push(`Gemini selection failed (${error.message}). The code picker filled the edition from verified candidates.`);
    return [];
  }
}

async function keepValid(pool, existing, date, options, warnings) {
  const rejected = new Set();
  const kept = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const available = pool.filter((item) => !rejected.has(item.candidateId) && !kept.some((keptItem) => keptItem.candidateId === item.candidateId));
    const picked = chooseItems(available, [...existing, ...kept], {
      ...options,
      preferredIds: pass === 0 ? options.preferredIds : [],
    });
    const fresh = picked.filter((item) => !kept.some((keptItem) => keptItem.candidateId === item.candidateId));
    if (!fresh.length) break;
    for (const candidate of fresh) {
      const result = await validateCandidate(candidate, date);
      if (!result.ok) {
        rejected.add(candidate.candidateId);
        warnings.push(`${candidate.source}: ${candidate.title} — ${result.error}`);
        continue;
      }
      const summary = usableSummary(candidate.modelSummary, { ...candidate, ...result.fields });
      if (!summary) {
        rejected.add(candidate.candidateId);
        warnings.push(`${candidate.source}: ${candidate.title} — summary failed the house rules`);
        continue;
      }
      kept.push({ ...candidate, ...result.fields, summary, satire: candidate.ownChannel ? false : candidate.satire });
    }
  }
  return kept;
}

export async function attachRedditImages(items, { writeRoot, generateImage, dryRun, warnings }) {
  const kept = [];
  let numberOwner = items;
  for (const item of numberOwner) {
    if (item.type !== 'reddit') {
      kept.push(item);
      continue;
    }
    if (dryRun) {
      kept.push({ ...item, thumbnailNote: `Image would be generated with ${IMAGE_MODEL}.` });
      continue;
    }
    try {
      const bytes = await generateImage(item);
      if (!bytes) throw new Error(`${IMAGE_MODEL} returned no image`);
      const jpeg = await toFeedJpeg(bytes);
      const relative = path.join('feed', 'images', 'reddit', `${item.id}.jpg`);
      const file = path.join(writeRoot, relative);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, jpeg);
      kept.push({ ...item, thumbnailUrl: PAGES_REDDIT_IMAGE(item.id) });
    } catch (error) {
      warnings.push(`Dropped ${item.id} after image generation failed: ${error.message}`);
      await rm(path.join(writeRoot, 'feed', 'images', 'reddit', `${item.id}.jpg`), { force: true });
    }
  }
  return kept;
}

function assignIds(items, date, edition, day, generateImage, writeRoot, dryRun, warnings) {
  let number = nextItemNumber(day, edition);
  const identified = [];
  for (const item of items) {
    if (item.type === 'reddit') continue;
    const id = `${date}-${edition}-${String(number).padStart(2, '0')}`;
    number += 1;
    identified.push({ ...item, id });
  }
  const reddit = [];
  for (const item of items) {
    if (item.type !== 'reddit') continue;
    const id = `${date}-${edition}-${String(number).padStart(2, '0')}`;
    number += 1;
    reddit.push({ ...item, id, thumbnailUrl: '' });
  }
  return attachRedditImages([...identified, ...reddit], { writeRoot, generateImage, dryRun, warnings });
}

function describe(item) {
  const lines = [
    `- **${item.id || 'new'}** (${item.type}, ${item.source}) ${item.title}`,
    `  ${item.summary || ''}`,
    `  ${item.url}`,
  ];
  if (item.thumbnailNote) lines.push(`  ${item.thumbnailNote}`);
  if (item.paywalled) lines.push('  paywalled');
  if (item.satire) lines.push('  satire');
  return lines.join('\n');
}

export async function curate(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const env = options.env || process.env;
  const readRoot = options.readRoot || repoRoot;
  const writeRoot = options.writeRoot || readRoot;
  const offline = options.offline === true || env.CURATE_OFFLINE === '1';
  const dryRun = options.dryRun === true || ['1', 'true', 'yes'].includes(String(env.CURATE_DRY_RUN || '').toLowerCase());
  const allowReddit = options.allowReddit ?? redditImagesEnabled(env);
  const decision = options.edition
    ? { edition: options.edition, date: options.date || etDate(now), forced: true }
    : editionDue(now);
  if (!decision) {
    const parts = etParts(now);
    const clock = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
    return {
      action: 'not-due',
      summary: `Not due. It is ${clock} Eastern on ${parts.date}, which is neither the midnight hour nor the noon hour. The other daylight-saving cron exits here.`,
    };
  }
  if (decision.edition !== 'midnight' && decision.edition !== 'noon') {
    throw new Error('edition must be midnight or noon');
  }

  const loaded = await loadFeed(readRoot);
  const current = loaded.days.get(decision.date);
  if (current?.editions?.some((edition) => edition.name === decision.edition)) {
    return {
      action: 'already-published',
      date: decision.date,
      edition: decision.edition,
      summary: `${decision.date} ${decision.edition} is already in the feed.`,
    };
  }

  const apiKey = offline ? '' : requireGeminiKey(env);
  const warnings = [];
  const gathered = await gatherCandidates({
    edition: decision.edition,
    date: decision.date,
    allowReddit,
    googleNewsLimit: options.googleNewsLimit ?? 12,
    resolveNews: options.resolveNews,
  });
  warnings.push(...gathered.warnings);

  const todayExisting = feedItemsOn(current).map(annotateFeedItem);
  const yesterday = previousDate(decision.date);
  const yesterdayFile = loaded.days.get(yesterday);
  const yesterdayExisting = feedItemsOn(yesterdayFile).map(annotateFeedItem);
  const seen = new Set();
  for (const file of loaded.days.values()) {
    for (const item of feedItemsOn(file)) {
      if (!item.url) continue;
      seen.add(canonicalUrl(item.url));
      const video = youtubeId(item.url);
      if (video) seen.add(`yt:${video}`);
    }
  }
  const fresh = gathered.candidates.filter((item) => {
    if (seen.has(canonicalUrl(item.url))) return false;
    if (item.videoId && seen.has(`yt:${item.videoId}`)) return false;
    return true;
  });
  const selectOptions = {
    blockedShows: blockedShowsFrom([...todayExisting, ...yesterdayExisting]),
    allowReddit,
    satireAllowed: !satireRecently(loaded.days, decision.date),
  };
  const todayPool = fresh.filter((item) => onDate(item.publishedAt, decision.date));
  const latePool = decision.edition === 'midnight' ? fresh.filter((item) => itemIsLate(item.publishedAt, yesterday)) : [];

  let preferredToday = [];
  if (!offline) {
    preferredToday = await pickWithGemini(todayPool, {
      apiKey,
      model: options.model || TEXT_MODEL,
      edition: decision.edition,
      date: decision.date,
      existingSummary: existingSummary(todayExisting),
    }, warnings);
  }
  const keptToday = await keepValid(todayPool, todayExisting, decision.date, { ...selectOptions, preferredIds: preferredToday }, warnings);
  const ownCount = [...todayExisting, ...keptToday].filter((item) => item.ownChannel).length;
  if (ownCount !== 1) {
    throw new Error(
      `${decision.date} would have ${ownCount} Mormon News Roundup videos after this ${decision.edition} run. The channel posts a long episode at 9:30 p.m. Eastern and a Short around midnight. Nothing was written.`,
    );
  }

  let lateKept = [];
  if (latePool.length && yesterdayFile) {
    let preferredLate = [];
    if (!offline) {
      preferredLate = await pickWithGemini(latePool, {
        apiKey,
        model: options.model || TEXT_MODEL,
        edition: 'noon',
        date: yesterday,
        existingSummary: existingSummary(yesterdayExisting),
      }, warnings);
    }
    lateKept = await keepValid(
      latePool,
      yesterdayExisting,
      yesterday,
      {
        ...selectOptions,
        blockedShows: blockedShowsFrom([...todayExisting, ...yesterdayExisting, ...keptToday]),
        preferredIds: preferredLate,
      },
      warnings,
    );
  }

  let swap = null;
  if (decision.edition === 'midnight') {
    const own = yesterdayExisting.filter((item) => item.ownChannel);
    const shorts = own.filter((item) => item.short || /\/shorts\//.test(item.url));
    const longs = own.filter((item) => !shorts.includes(item));
    if (shorts.length && !longs.length) {
      const longform = gathered.candidates
        .filter((item) => item.ownChannel && !item.short && onDate(item.publishedAt, yesterday))
        .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))[0];
      if (longform) {
        const validated = await validateCandidate(longform, yesterday);
        const summary = usableSummary(longform.modelSummary, longform);
        if (validated.ok && summary) {
          swap = {
            id: shorts[0].id,
            title: longform.title,
            summary,
            url: `https://www.youtube.com/watch?v=${validated.fields.videoId || longform.videoId}`,
            thumbnailUrl: validated.fields.thumbnailUrl,
            publishedAt: longform.publishedAt,
          };
        } else {
          warnings.push(`Own-channel swap skipped: ${validated.error || 'summary failed'}`);
        }
      }
    }
  }

  const generateImage = options.generateImage
    || (offline ? async () => null : (item) => geminiImage({ apiKey, item, model: options.imageModel || IMAGE_MODEL }));
  const todayNumbered = await assignIds(
    keptToday,
    decision.date,
    decision.edition,
    current,
    generateImage,
    writeRoot,
    dryRun,
    warnings,
  );
  const todayItems = todayNumbered.map(toFeedItem);
  const lateEdition = editionForLateItems(yesterdayFile);
  const lateNumbered = lateEdition
    ? await assignIds(lateKept, yesterday, lateEdition, yesterdayFile, generateImage, writeRoot, dryRun, warnings)
    : [];
  const lateItems = lateNumbered.map(toFeedItem);

  if (!todayItems.length && !lateItems.length && !swap) {
    return {
      action: 'nothing-new',
      date: decision.date,
      edition: decision.edition,
      warnings,
      summary: [`Nothing new passed validation for ${decision.date} ${decision.edition}.`, ...warnings].join('\n'),
    };
  }

  const lines = [
    `# ${decision.date} ${decision.edition}`,
    '',
    `Text model: ${TEXT_MODEL}. Image model: ${IMAGE_MODEL}. Reddit images: ${allowReddit ? 'on' : 'off'}.`,
    '',
    '## This edition',
    ...todayNumbered.map(describe),
  ];
  if (lateItems.length) {
    lines.push('', `## Late items added to ${yesterday} ${lateEdition}`, ...lateItems.map(describe));
  }
  if (swap) {
    lines.push('', `## Own-channel swap in ${yesterday}`, `- ${swap.id} becomes ${swap.title}`, `  ${swap.url}`);
  }
  if (warnings.length) {
    lines.push('', '## Warnings', ...warnings.map((warning) => `- ${warning}`));
  }
  const summary = lines.join('\n');
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `${summary}\n`);

  if (dryRun) {
    return { action: 'dry-run', date: decision.date, edition: decision.edition, items: todayItems, lateItems, swap, warnings, summary };
  }

  const generatedAt = now.toISOString();
  const files = [];
  let nextIndex = { ...loaded.index, generatedAt };
  if (todayItems.length) {
    const base = current || { date: decision.date, sample: false, editions: [] };
    const nextDay = placeEdition(base, decision.edition, editionPublishedAt(decision.date, decision.edition), todayItems);
    const file = path.join(writeRoot, 'feed', 'days', `${decision.date}.json`);
    await writeJson(file, nextDay);
    files.push(file);
    nextIndex = withDate(loaded.index, decision.date, generatedAt);
  }
  if (yesterdayFile && (lateItems.length || swap)) {
    let nextYesterday = yesterdayFile;
    if (swap) nextYesterday = replaceItem(nextYesterday, swap.id, {
      id: swap.id,
      type: 'video',
      title: swap.title,
      summary: swap.summary,
      source: 'Mormon News Roundup',
      url: swap.url,
      thumbnailUrl: swap.thumbnailUrl,
      publishedAt: swap.publishedAt,
      paywalled: false,
      tags: ['mormon-news-roundup', 'own-channel'],
    });
    if (lateItems.length) {
      nextYesterday = placeEdition(
        nextYesterday,
        lateEdition,
        nextYesterday.editions.find((edition) => edition.name === lateEdition).publishedAt,
        lateItems,
      );
    }
    const file = path.join(writeRoot, 'feed', 'days', `${yesterday}.json`);
    await writeJson(file, nextYesterday);
    files.push(file);
  }
  const indexFile = path.join(writeRoot, 'feed', 'index.json');
  await writeJson(indexFile, nextIndex);
  files.push(indexFile);

  return {
    action: 'published',
    date: decision.date,
    edition: decision.edition,
    items: todayItems,
    lateItems,
    swap,
    warnings,
    summary,
    files,
    message: formatEditionMessage(decision.date, decision.edition),
    writeRoot,
    readRoot,
  };
}

export async function commitPublished(result) {
  if (result.action !== 'published') return;
  const cwd = result.writeRoot;
  const git = (args) => runCommand('git', args, cwd);
  const paths = result.files.map((file) => path.relative(cwd, file));
  const imageDir = path.join(cwd, 'feed', 'images', 'reddit');
  await git(['add', '--', ...paths, imageDir]).catch(() => git(['add', '--', ...paths]));
  await git([
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit',
    '-m',
    result.message,
  ]);
  try {
    await git(['pull', '--rebase', 'origin', 'main']);
  } catch (error) {
    await git(['rebase', '--abort']).catch(() => {});
    throw new Error(`The feed changed on main while this edition was built. Nothing was pushed. ${error.message}`);
  }
  try {
    await runCommand('npm', ['run', 'check-feed'], cwd);
  } catch (error) {
    await git(['reset', '--mixed', 'HEAD~1']).catch(() => {});
    throw error;
  }
  await git(['push', 'origin', 'HEAD:main']);
}

export async function restoreFeed(root) {
  const git = (args) => runCommand('git', args, root);
  await git(['checkout', '--', 'feed']).catch(() => {});
  await git(['clean', '-f', '--', 'feed/images/reddit']).catch(() => {});
}
