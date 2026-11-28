import { IMAGE_MODEL, TEXT_MODEL, TEXT_MODEL_FALLBACK } from './sources.mjs';

const MISSING_KEY =
  'GEMINI_API_KEY is missing. Add a repository secret named GEMINI_API_KEY under Settings > Secrets and variables > Actions (https://github.com/MormonNewsRoundup/mormon-news-roundup/settings/secrets/actions). The curator cannot publish without it.';

export function requireGeminiKey(env = process.env) {
  const key = env.GEMINI_API_KEY;
  if (typeof key !== 'string' || key.trim() === '') {
    const error = new Error(MISSING_KEY);
    error.code = 'MISSING_GEMINI_API_KEY';
    throw error;
  }
  return key.trim();
}

async function generate(model, body, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  return { status: response.status, payload, text, retryAfter: response.headers.get('retry-after') };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(result) {
  const header = Number(result?.retryAfter);
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 20_000);
  return 8_000;
}

function redact(text) {
  return String(text || '')
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[redacted]')
    .replace(/GEMINI_API_KEY[=:]\s*\S+/gi, 'GEMINI_API_KEY=[redacted]')
    .slice(0, 300);
}

const SELECTION_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidateId: { type: 'string' },
          summary: { type: 'string' },
          major: { type: 'boolean' },
        },
        required: ['candidateId', 'summary', 'major'],
      },
    },
  },
  required: ['items'],
};

/** Pull a JSON object out of a model reply, including fenced blocks. */
export function parseSelectionText(raw) {
  if (typeof raw !== 'string') return null;
  let text = raw.trim();
  if (!text) return null;
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const attempts = [text];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // try the next slice
    }
  }
  return null;
}

function normalizeSelection(parsed) {
  const list = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(list)) return null;
  const items = list
    .filter((item) => item && typeof item.candidateId === 'string')
    .map((item) => ({
      candidateId: item.candidateId,
      summary: typeof item.summary === 'string' ? item.summary.trim() : '',
      major: item.major === true,
    }));
  return items.length ? items : null;
}

function selectionFromResult(result) {
  const parts = result?.payload?.candidates?.[0]?.content?.parts || [];
  const visible = parts.filter((part) => !part.thought).map((part) => part.text || '').join('');
  const all = parts.map((part) => part.text || '').join('');
  for (const raw of [visible, all]) {
    const parsed = parseSelectionText(raw);
    const items = parsed ? normalizeSelection(parsed) : null;
    if (items) return items;
  }
  return null;
}

async function requestSelection(model, apiKey, prompt) {
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  const withSchema = {
    contents,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: SELECTION_SCHEMA,
    },
  };
  let result = await generate(model, withSchema, apiKey);
  if (result.status === 400) {
    result = await generate(model, {
      contents,
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }, apiKey);
  }
  return result;
}

export async function geminiSelect({ apiKey, model = TEXT_MODEL, fallbackModel = TEXT_MODEL_FALLBACK, prompt }) {
  const primary = model || TEXT_MODEL;
  const rejectKey = (result) => {
    const error = new Error(`Gemini rejected GEMINI_API_KEY (HTTP ${result.status}). ${redact(result.text)}`);
    error.code = 'GEMINI_AUTH';
    throw error;
  };
  let result = await requestSelection(primary, apiKey, prompt);
  if (result.status === 401 || result.status === 403) rejectKey(result);
  let picked = selectionFromResult(result);
  if (!picked) {
    if (result.status === 429 || result.status >= 500) await sleep(retryDelay(result));
    result = await requestSelection(primary, apiKey, prompt);
    if (result.status === 401 || result.status === 403) rejectKey(result);
    picked = selectionFromResult(result);
  }
  if (!picked && fallbackModel && fallbackModel !== primary) {
    result = await requestSelection(fallbackModel, apiKey, prompt);
    if (result.status === 401 || result.status === 403) rejectKey(result);
    picked = selectionFromResult(result);
  }
  if (!picked) throw new Error('Gemini did not return JSON.');
  return picked;
}

export function selectionPrompt(pool, context) {
  const lines = pool.map((item) =>
    [
      item.candidateId,
      item.type,
      item.source,
      item.publishedAt,
      item.ownChannel ? 'own-channel' : '',
      item.short ? 'short' : '',
      item.church ? 'church-source' : '',
      item.tribune ? 'tribune' : '',
      item.blog ? 'blog' : '',
      item.satire ? 'satire' : '',
      item.generallyUnquotable ? 'generally-unquotable' : '',
      item.culturalHall ? 'cultural-hall' : '',
      item.subreddit || '',
      item.title,
      (item.description || '').slice(0, 320),
    ]
      .filter(Boolean)
      .join(' | '),
  );
  return [
    'You curate Mormon News Roundup. Pick items from the list and write summaries. Return JSON only.',
    'The feed is hard news about The Church of Jesus Christ of Latter-day Saints and Mormonism: lawsuits, abuse cases, excommunications, finances, scandals, policy fights, BYU / BYU-Idaho / BYU-Hawaii scandals, church business and real estate (Ensign Peak, Farmland Reserve), temple zoning fights and protests. FLDS and other Restoration groups only when the item is newsworthy.',
    'Prefer scrutiny over church public relations. Prefer an independent outlet over Church News, the Newsroom, Deseret News, or KSL when both cover the same story.',
    'Each summary is one sentence, names the source, and uses only facts in that item\'s title and description. Do not add claims. Use the source\'s careful legal wording and do not state accusations as fact. No morning, afternoon, evening, tonight, overnight, a.m., or p.m. Do not write "X discusses Y" or "X reports Y".',
    'Skip betting, odds, and sports that are not about BYU. BYU game news and previews may stay. Keep a non-BYU sports item only when the story is about the church itself, such as an honor-code or abuse scandal. Skip deals, coupons, and shopping posts.',
    'Do not pick a source that is already among the newest headlines, except Mormon News Roundup. The same source may appear further back in the archive.',
    'Blog and Substack items are the author\'s commentary: say the author argues, writes, or says. Reddit summaries must start with "An r/exmormon post claims" or "An r/mormon post claims" and stay neutral.',
    'Never mark the Mormon News Roundup channel as satire. Satire is only for an item already labeled satire.',
    'Set major true only for a genuinely major church-source story (a criminal case, a financial scandal, or a policy change). Otherwise major is false.',
    'Skip Cultural Hall items that are not current news. Do not pick an id that is not in the list. Do not invent items.',
    `Edition ${context.edition} for ${context.date}. Already on this day: ${context.existingSummary}. Caps for the whole day, counting those items: 5 to 7 articles, 2 to 3 videos including exactly one Mormon News Roundup video, at least 1 podcast and ideally 2, up to 2 Reddit posts, at most 3 Salt Lake Tribune items, at most 2 blog posts, at most 3 church-source items unless one is major, at most 1 satire, at most 1 Generally Unquotable video.`,
    'Items:',
    ...lines,
  ].join('\n');
}

const IMAGE_PROMPT = (item) =>
  [
    'Create one 16:9 editorial illustration of the subject below.',
    'Center the subject and leave generous margins.',
    'No text, letters, numbers, logos, watermarks, or the Reddit mascot.',
    'No real or identifiable person. Use anonymous silhouettes or symbolic objects if people are part of the subject.',
    'Muted newspaper-illustration colors. No caption.',
    `Subject: ${item.title}`,
    item.summary ? `Context: ${item.summary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

function imageBytes(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const image = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const data = image?.inlineData?.data || image?.inline_data?.data;
  if (!data) return null;
  return Buffer.from(data, 'base64');
}

function blocked(payload) {
  const reason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason || '';
  return /SAFETY|BLOCK|PROHIBITED/i.test(String(reason));
}

/**
 * One image call, then one retry after a backoff on 429, quota, or a safety block.
 * Any failure returns null. Callers drop the Reddit item.
 */
export async function geminiImage({ apiKey, item, model = IMAGE_MODEL }) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: IMAGE_PROMPT(item) }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '16:9' },
    },
  };
  const attempt = () => generate(model, body, apiKey);
  let result = await attempt();
  const retryable = result.status === 429 || result.status === 503 || blocked(result.payload);
  if (retryable || !imageBytes(result.payload)) {
    if (result.status === 400 && !blocked(result.payload)) return null;
    await sleep(retryDelay(result));
    result = await attempt();
  }
  return imageBytes(result.payload);
}
