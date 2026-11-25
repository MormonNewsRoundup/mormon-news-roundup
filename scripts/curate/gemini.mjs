import { IMAGE_MODEL, TEXT_MODEL } from './sources.mjs';

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
  const header = Number(result.retryAfter);
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 20_000);
  return 8_000;
}

export async function geminiSelect({ apiKey, model = TEXT_MODEL, prompt }) {
  const schema = {
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
  const base = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  };
  let result = await generate(model, base, apiKey);
  if (result.status === 400) {
    result = await generate(
      model,
      {
        contents: base.contents,
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      },
      apiKey,
    );
  }
  if (result.status === 429 || result.status >= 500) {
    await sleep(retryDelay(result));
    result = await generate(model, base, apiKey);
  }
  if (result.status === 401 || result.status === 403) {
    throw new Error(`Gemini rejected GEMINI_API_KEY (HTTP ${result.status}). ${result.text.slice(0, 300)}`);
  }
  if (!result.payload) {
    throw new Error(`Gemini returned HTTP ${result.status} without JSON.`);
  }
  const raw = result.payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Gemini did not return JSON.');
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items
    .filter((item) => item && typeof item.candidateId === 'string')
    .map((item) => ({
      candidateId: item.candidateId,
      summary: typeof item.summary === 'string' ? item.summary.trim() : '',
      major: item.major === true,
    }));
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
    'Summaries are 1 or 2 sentences, name the source, and use only facts in that item\'s title and description. Do not add claims. Use the source\'s careful legal wording and do not state accusations as fact. No morning, afternoon, evening, tonight, overnight, a.m., or p.m.',
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
