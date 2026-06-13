/**
 * URL metadata scraping. Tries (in order):
 *   1. YouTube oEmbed for known YouTube hosts (fastest, structured)
 *   2. Open Graph / Twitter Card / <title> tags from a HEAD-then-GET fetch
 *   3. Hostname fallback
 *
 * Stays small and dependency-free — we parse a slice of the HTML head, not
 * the whole document. That keeps the server tiny and avoids pulling in
 * cheerio / a full HTML parser.
 */

export type ContentType = 'youtube' | 'article' | 'podcast' | 'reel' | 'other';

export type EnrichResult = {
  title: string | null;
  thumbnailUrl: string | null;
  contentType: ContentType;
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
]);
const PODCAST_HOSTS = new Set([
  'open.spotify.com',
  'podcasts.apple.com',
  'soundcloud.com',
  'pocketcasts.com',
]);
const REEL_HINTS = ['/reel/', '/shorts/', 'tiktok.com'];

const FETCH_TIMEOUT_MS = 6_000;
const MAX_HTML_BYTES = 256 * 1024; // 256KB of <head> is plenty.

export function guessContentType(rawUrl: string): ContentType {
  let host = '';
  let pathname = '';
  try {
    const u = new URL(rawUrl);
    host = u.hostname.toLowerCase();
    pathname = u.pathname.toLowerCase();
  } catch {
    return 'other';
  }
  if (REEL_HINTS.some((hint) => `${host}${pathname}`.includes(hint))) {
    return 'reel';
  }
  if (YOUTUBE_HOSTS.has(host)) return 'youtube';
  if (PODCAST_HOSTS.has(host)) return 'podcast';
  if (/\.(com|org|net|io|dev|in|co|me|so|ai|xyz)$/.test(host)) return 'article';
  return 'other';
}

export async function enrich(rawUrl: string): Promise<EnrichResult> {
  const trimmed = rawUrl.trim();
  const contentType = guessContentType(trimmed);
  const fallback: EnrichResult = {
    title: hostnameOf(trimmed),
    thumbnailUrl: null,
    contentType,
  };

  if (contentType === 'youtube') {
    const yt = await tryYouTubeOEmbed(trimmed);
    if (yt) return { ...yt, contentType };
  }

  const og = await tryOpenGraph(trimmed);
  if (og) return { ...og, contentType };

  return fallback;
}

async function tryYouTubeOEmbed(url: string): Promise<Omit<EnrichResult, 'contentType'> | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url,
    )}&format=json`;
    const res = await fetchWithTimeout(oembed);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return {
      title: data.title ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

async function tryOpenGraph(url: string): Promise<Omit<EnrichResult, 'contentType'> | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; InwardBot/1.0; +https://inward.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await readBoundedText(res, MAX_HTML_BYTES);
    return parseHead(html, url);
  } catch {
    return null;
  }
}

async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
  }
  reader.cancel().catch(() => undefined);
  // Concatenate (for short inputs this is fine; we only ever read 256KB max)
  const total = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk.subarray(0, Math.min(chunk.byteLength, received - offset)), offset);
    offset += chunk.byteLength;
    if (offset >= received) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(total);
}

function parseHead(
  html: string,
  baseUrl: string,
): Omit<EnrichResult, 'contentType'> {
  const head = html.split(/<\/head>/i)[0] ?? html;

  const ogTitle = pickMeta(head, ['og:title', 'twitter:title']);
  const titleTag = matchTag(head, /<title[^>]*>([^<]+)<\/title>/i);
  const ogImage = pickMeta(head, ['og:image', 'twitter:image']);

  return {
    title: decodeEntities(ogTitle ?? titleTag ?? null),
    thumbnailUrl: absoluteUrl(decodeEntities(ogImage ?? null), baseUrl),
  };
}

function pickMeta(head: string, properties: string[]): string | null {
  for (const prop of properties) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegex(prop)}["'][^>]*content=["']([^"']+)["']`,
      'i',
    );
    const m = head.match(re);
    if (m && m[1]) return m[1];
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escapeRegex(prop)}["']`,
      'i',
    );
    const m2 = head.match(re2);
    if (m2 && m2[1]) return m2[1];
  }
  return null;
}

function matchTag(input: string, pattern: RegExp): string | null {
  const m = input.match(pattern);
  return m && m[1] ? m[1].trim() : null;
}

function absoluteUrl(maybeUrl: string | null, base: string): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

function decodeEntities(input: string | null): string | null {
  if (!input) return input;
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hostnameOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
