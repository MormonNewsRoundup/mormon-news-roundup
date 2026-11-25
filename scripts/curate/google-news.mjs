import { BROWSER_UA } from './http.mjs';

/**
 * Google News RSS links are not publisher URLs. The article page carries
 * data-n-a-ts and data-n-a-sg, and a batchexecute call returns the real URL.
 */
export async function resolveGoogleNewsUrl(articleUrl, fetchImpl = fetch) {
  const id = new URL(articleUrl).pathname.split('/').filter(Boolean).pop();
  if (!id) return null;
  const pageUrl = `https://news.google.com/rss/articles/${id}`;
  const pageResponse = await fetchImpl(pageUrl, {
    headers: { 'user-agent': BROWSER_UA, accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!pageResponse.ok) return null;
  const html = await pageResponse.text();
  const gid = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  if (!gid || !timestamp || !signature) return null;
  const inner = [
    'garturlreq',
    [
      ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X',
      'X',
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    gid,
    Number(timestamp),
    signature,
  ];
  const body = new URLSearchParams({
    'f.req': JSON.stringify([[['Fbv4je', JSON.stringify(inner), null, 'generic']]]),
  });
  const response = await fetchImpl(
    `https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je&hl=en-US&gl=US&rt=c`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': BROWSER_UA,
        referer: 'https://news.google.com/',
      },
      body,
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) return null;
  const text = await response.text();
  const match = text.match(/https?:\/\/[^"\\]+/);
  if (!match) return null;
  const resolved = match[0];
  if (/news\.google\.com/i.test(resolved)) return null;
  return resolved;
}
