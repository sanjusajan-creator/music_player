
'use server';

import { Track } from '@/store/usePlayerStore';

/**
 * Sovereign YouTube Scraper
 * Fetches real results directly from YouTube without API keys.
 */
export async function scrapeYouTubeSearch(query: string): Promise<Track[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) throw new Error("YouTube Vault unreachable.");

    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData = (\{.*?\});/);
    
    if (!dataMatch) throw new Error("Failed to parse Oracle data.");

    const data = JSON.parse(dataMatch[1]);
    const results: Track[] = [];

    // Navigate the complex YouTube JSON structure (Innertune-style)
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const items = contents?.[0]?.itemSectionRenderer?.contents || [];

    for (const item of items) {
      const video = item.videoRenderer;
      if (!video) continue;

      const videoId = video.videoId;
      const title = video.title.runs[0].text;
      const artist = video.ownerText.runs[0].text;
      
      results.push({
        id: videoId,
        title: normalizeMetadata(title),
        artist: normalizeMetadata(artist),
        // Use hqdefault for 100% reliability; maxresdefault is often missing for non-HD music
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: parseDuration(video.lengthText?.simpleText || "0:00")
      });

      if (results.length >= 15) break;
    }

    return results;
  } catch (error) {
    console.error("Scraper Error:", error);
    return [];
  }
}

function normalizeMetadata(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\(Official Video\)/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/VEVO/gi, '')
    .trim();
}

function parseDuration(text: string): number {
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
