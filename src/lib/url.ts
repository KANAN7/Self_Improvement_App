import type { VaultContentType } from '@/lib/db/schema';

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
const PODCAST_HINTS = ['spotify.com', 'apple.com/podcast', 'soundcloud.com', 'pocketcasts.com'];
const REEL_HINTS = ['instagram.com/reel', 'tiktok.com', 'youtube.com/shorts', 'youtu.be/shorts'];

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
 * Best-effort metadata fetch. Today this calls YouTube's public oEmbed for
 * YouTube URLs (no key/CORS friction); everything else returns the hostname
 * as a placeholder title. Phase 5 will replace this with a backend
 * `/enrich` call that does proper Open Graph scraping.
 */
export async function enrichUrl(rawUrl: string): Promise<EnrichResult> {
  const trimmed = rawUrl.trim();
  const contentType = guessContentType(trimmed);
  const fallback: EnrichResult = {
    title: hostnameOf(trimmed),
    thumbnailUrl: null,
    contentType,
  };

  if (contentType === 'youtube') {
    try {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        trimmed,
      )}&format=json`;
      const res = await fetch(oembed);
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        title?: string;
        thumbnail_url?: string;
      };
      return {
        title: data.title ?? fallback.title,
        thumbnailUrl: data.thumbnail_url ?? null,
        contentType,
      };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function hostnameOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
