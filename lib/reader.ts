function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const number = Number(code);
      return number > 0 && number < 65536 ? String.fromCharCode(number) : '';
    });
}

function plain(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Best-effort article text for the in-app reader. Returns null when the page
 * is a paywall, a script shell, or too short to be the story.
 */
export async function extractArticleText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    const article = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned;
    const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => plain(match[1]))
      .filter((paragraph) => paragraph.length >= 80)
      .filter((paragraph) => !/cookie|subscribe to continue|sign in to read/i.test(paragraph));
    if (paragraphs.length < 2) return null;
    return paragraphs.slice(0, 12).join('\n\n');
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
