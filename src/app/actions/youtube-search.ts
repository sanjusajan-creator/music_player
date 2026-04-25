'use server';

import { Track } from '@/store/usePlayerStore';

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';
const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';

/**
 * Robust Fetch Implementation
 * Reads as text then parses to prevent JSON metamorphosis errors.
 */
async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`%cOracle: Vault access denied [${res.status}] at ${url}`, "color: #FF0000; font-weight: bold;");
      return null;
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseError) {
      console.error(`%cOracle: Manifestation corruption at ${url}`, "color: #FF0000; font-weight: bold;", text.substring(0, 100));
      return null;
    }
  } catch (e) {
    console.error(`%cOracle: Network sanctuary interrupted at ${url}`, "color: #FF0000; font-weight: bold;");
    return null;
  }
}

/**
 * Normalizes manifestations into the Sovereign Schema
 */
function normalizeYTTrack(item: any): Track {
  const id = item?.videoId || item?.id || item?.navigationEndpoint?.watchEndpoint?.videoId;
  return {
    id: id || "unknown_id",
    videoId: id,
    title: item?.title?.runs?.[0]?.text || item?.title || "YouTube Track",
    artist: item?.artist?.runs?.[0]?.text || item?.author || item?.subtitle?.runs?.[0]?.text || "YouTube Music",
    thumbnail: item?.thumbnail?.thumbnails?.slice(-1)[0]?.url || item?.thumbnails?.[0]?.url || `https://picsum.photos/seed/${id}/400/400`,
    duration: item?.duration?.text || item?.duration || "0:00",
    source: 'youtube' as const,
    isYouTube: true,
    type: (item?.type || 'song') as any,
    streamUrl: id ? `${YT_MUSIC_API_BASE}/streams/${id}` : undefined
  };
}

/**
 * Sovereign Unified Search Oracle
 */
export async function searchAllAction(query: string, source: string = 'all') {
  const cleanQuery = query?.toLowerCase().trim();
  if (!cleanQuery) return { success: false, results: [] };

  console.log(`%cOracle: Summoning Archives for "${cleanQuery}" [Source: ${source}]`, "color: #FFD700; font-weight: 900;");

  const results: Track[] = [];

  try {
    if (source === 'all' || source === 'youtube') {
      const ytResults = await fetchYouTubeMusic(cleanQuery);
      results.push(...ytResults);
    }
    if (source === 'all' || source === 'jiosaavn') {
      const saavnResults = await fetchSaavn(cleanQuery);
      results.push(...saavnResults);
    }
    if (source === 'all' || source === 'gaana') {
      const gaanaResults = await fetchGaana(cleanQuery);
      results.push(...gaanaResults);
    }

    return {
      success: true,
      count: results.length,
      results: results
    };
  } catch (error) {
    console.error("Oracle: Search sanctuary collapsed.", error);
    return { success: false, results: [] };
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
  if (!data) return [];
  
  let raw: any[] = [];
  if (Array.isArray(data.results)) raw = data.results;
  else if (data.contents?.tabbedSearchResultsRenderer) {
    const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
    raw = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.flatMap((s: any) => 
      (s.musicShelfRenderer || s.musicCardShelfRenderer)?.contents || []
    ) || [];
  }

  return raw.map(normalizeYTTrack).filter(t => t.id && t.id !== "unknown_id");
}

async function fetchSaavn(query: string): Promise<Track[]> {
  const data = await safeFetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
  const raw = data?.data?.songs?.results || [];
  return raw.map((t: any) => ({
    id: t.id,
    title: t.title || t.name,
    artist: t.primaryArtists || t.artist || "Saavn Artist",
    thumbnail: t.image?.[2]?.url || t.image?.[0]?.url,
    album: t.album?.name || t.album || "Saavn Archive",
    duration: t.duration,
    source: 'jiosaavn' as const,
    isYouTube: false
  }));
}

async function fetchGaana(query: string): Promise<Track[]> {
  const data = await safeFetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  const raw = data?.data?.songs || [];
  return raw.map((t: any) => ({
    id: t.track_id || t.id,
    title: t.title || t.name,
    artist: t.artists || t.artist || "Gaana Artist",
    thumbnail: t.artworkUrl || t.image,
    duration: t.duration,
    source: 'gaana' as const,
    isYouTube: false
  }));
}

export async function getTrendingAction(region: string = 'IN') {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/trending?region=${region}`);
  return (data?.results || []).slice(0, 10).map(normalizeYTTrack);
}

export async function getMusicHomeAction() {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/home`);
  if (!data) return [];
  const sections = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  return sections.slice(0, 5).map((sec: any) => {
    const shelf = sec.musicCarouselShelfRenderer;
    return {
      title: shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || "Music Pick",
      items: (shelf?.contents || []).map((item: any) => normalizeYTTrack(item.musicTwoRowItemRenderer || item))
    };
  }).filter((s: any) => s.items.length > 0);
}

export async function getRelatedTracksAction(videoId: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/next/${videoId}`);
  return (data?.results || []).map(normalizeYTTrack);
}

export async function getPlaylistAction(id: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/playlist/${id}`);
  if (!data) return null;
  return {
    title: data.title || "Playlist",
    tracks: (data.results || []).map(normalizeYTTrack)
  };
}

export async function getLyricsAction(videoId: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/lyrics/${videoId}`);
  return data?.lyrics || null;
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  if (track.source === 'youtube' || track.isYouTube) {
    // Check for potential player blocks
    const playerData = await safeFetch(`${YT_MUSIC_API_BASE}/api/player/${track.videoId || track.id}`);
    const status = playerData?.player_data?.playabilityStatus?.status;
    
    if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE") {
      console.warn(`%cOracle: Bitstream blocked [${status}]. Metamorphosing to Video Sanctuary.`, "color: #FFD700; font-weight: bold;");
      return null; // Triggers iframe fallback
    }

    return `${YT_MUSIC_API_BASE}/streams/${track.videoId || track.id}`;
  }
  
  if (track.source === 'jiosaavn') {
    const data = await safeFetch(`${SAAVN_API_BASE}/api/songs/${track.id}`);
    const links = data?.data?.[0]?.downloadUrl;
    return links?.slice(-1)[0]?.url || null;
  }

  if (track.source === 'gaana') {
    const data = await safeFetch(`${GAANA_API_BASE}/api/songs/${track.id}`);
    return data?.data?.[0]?.stream_url || null;
  }

  return null;
}
