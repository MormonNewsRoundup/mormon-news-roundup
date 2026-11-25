import { execFile } from 'node:child_process';

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15';

function headerOverflow(error) {
  return error?.cause?.code === 'UND_ERR_HEADERS_OVERFLOW' || /headers overflow/i.test(`${error?.message || ''} ${error?.cause?.message || ''}`);
}

function curl(args, maxBuffer = 1_000_000) {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-sS', '--max-time', '25', '-A', BROWSER_UA, ...args], { maxBuffer, encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error && !stdout?.length) {
        reject(new Error(stderr?.toString().trim() || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

async function probeWithCurl(url) {
  const stdout = await curl(['-o', '/dev/null', '-L', '-w', '%{http_code}\n%{content_type}\n%{url_effective}', url], 100_000);
  const [statusText, contentType = '', finalUrl = url] = stdout.toString('utf8').trim().split('\n');
  const status = Number(statusText);
  return {
    ok: status === 200 || status === 206,
    status,
    contentType,
    finalUrl,
  };
}

export async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchText(url, { maxBytes = 800_000, timeoutMs = 20_000, headers = {} } = {}) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': BROWSER_UA, accept: '*/*', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      const error = new Error(`${response.status} ${url}`);
      error.status = response.status;
      throw error;
    }
    if (!response.body) return await response.text();
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
    }
    try {
      await reader.cancel();
    } catch {
      // The server may already have finished.
    }
    return new TextDecoder('utf-8').decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  } catch (error) {
    if (!headerOverflow(error)) throw error;
    const stdout = await curl(['-L', url], maxBytes + 65_536);
    return stdout.subarray(0, maxBytes).toString('utf8');
  }
}

/** Confirm a URL answers 200 (or 206) and return the content type. Does not download the body. */
export async function probeUrl(url, { timeoutMs = 20_000 } = {}) {
  if (/youtube\.com|youtu\.be/i.test(url)) return probeWithCurl(url);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': BROWSER_UA, accept: '*/*', range: 'bytes=0-2047' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get('content-type') || '';
    try {
      await response.body?.cancel();
    } catch {
      // ignore
    }
    const ok = response.status === 200 || response.status === 206;
    return { ok, status: response.status, contentType, finalUrl: response.url };
  } catch (error) {
    if (!headerOverflow(error)) throw error;
    return probeWithCurl(url);
  }
}

/**
 * A YouTube /shorts/ URL returns 200 for a Short and 303 to /watch for a long video.
 */
export async function isYouTubeShort(videoId) {
  const stdout = await curl(['-o', '/dev/null', '-w', '%{http_code}', `https://www.youtube.com/shorts/${videoId}`], 100_000);
  return Number(stdout.toString('utf8').trim()) === 200;
}
