import type { VaultContentType } from '@/lib/db/schema';

import { getBackendUrl } from './backend';

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
const PODCAST_HINTS = ['spotify.com', 'apple.com/podcast', 'soundcloud.com', 'pocketcasts.com'];
const REEL_HINTS = ['instagram.com/reel', 'tiktok.com', 'youtube.com/shorts', 'youtu.be/shorts'];

const ENRICH_TIMEOUT_MS = 6_000;

export function isUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function guessContentType(rawUrl: string): VaultContentType {
  const url = rawUrl.toLowerCase();
  if (REEL_HINTS.some((hint) => url.includes(hint))) return 'reel';
  if (YOUTUBE_HOSTS.some((host) => url.includes(host))) return 'youtube';
  if (PODCAST_HINTS.some((hint) => url.includes(hint))) return 'podcast';
  if (/\.(com|org|net|io|dev|in|co|me)/.test(url)) return 'article';
  return 'other';
}

export type EnrichResult = {
  title: string | null;
  thumbnailUrl: string | null;
  contentType: VaultContentType;
};

/**
 * Best-effort metadata fetch.
 *
 * Order of preference:
 *   1. Backend /enrich (proper Open Graph + oEmbed scraping, server-side).
 *   2. Client-side YouTube oEmbed (CORS-friendly, works without backend).
 *   3. Hostname fallback.
 *
 * Always resolves — never throws — so saving a URL is never blocked by
 * enrichment failure.
 */
export async function enrichUrl(rawUrl: string): Promise<EnrichResult> {
  const trimmed = rawUrl.trim();
  const contentType = guessContentType(trimmed);
  const fallback: EnrichResult = {
    title: hostnameOf(trimmed),
    thumbnailUrl: null,
    contentType,
  };

  // 1. Try the backend.
  const backendUrl = getBackendUrl();
  if (backendUrl) {
    try {
      const res = await fetchWithTimeout(`${backendUrl}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as EnrichResult;
        return {
          title: data.title ?? fallback.title,
          thumbnailUrl: data.thumbnailUrl ?? null,
          contentType: (data.contentType as VaultContentType) ?? contentType,
        };
      }
    } catch {
      // fall through
    }
  }

  // 2. Direct YouTube oEmbed (works without backend, CORS-allowed).
  if (contentType === 'youtube') {
    try {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        trimmed,
      )}&format=json`;
      const res = await fetchWithTimeout(oembed);
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string;
          thumbnail_url?: string;
        };
        return {
          title: data.title ?? fallback.title,
          thumbnailUrl: data.thumbnail_url ?? null,
          contentType,
        };
      }
    } catch {
      // fall through
    }
  }

  // 3. Hostname fallback.
  return fallback;
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
  const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
