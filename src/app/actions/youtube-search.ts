'use server';

import { Track } from '@/store/usePlayerStore';

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';
const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';

/**
 * Normalizes manifestations into the Sovereign Schema
 */
function normalizeYTTrack(item: any): Track {
  const id = item.videoId || item.id || item.navigationEndpoint?.watchEndpoint?.videoId;
  return {
    id: id,
    videoId: id,
    title: item.title?.runs?.[0]?.text || item.title || "YouTube Track",
    artist: item.artist?.runs?.[0]?.text || item.author || item.subtitle?.runs?.[0]?.text || "YouTube Music",
    thumbnail: item.thumbnail?.thumbnails?.slice(-1)[0]?.url || item.thumbnails?.[0]?.url || `https://picsum.photos/seed/${id}/400/400`,
    duration: item.duration?.text || item.duration || "0:00",
    source: 'youtube' as const,
    isYouTube: true,
    type: (item.type || 'song') as any,
    streamUrl: `${YT_MUSIC_API_BASE}/streams/${id}`
  };
}

/**
 * Sovereign Unified Search Oracle
 */
export async function searchAllAction(query: string, source: string = 'all') {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return null;

  console.log(`%cOracle: Summoning Archives for "${cleanQuery}" [Source: ${source}]`, "color: #FFD700; font-weight: 900;");

  const results: Track[] = [];

  try {
    const promises = [];
    if (source === 'all' || source === 'youtube') promises.push(fetchYouTubeMusic(cleanQuery));
    if (source === 'all' || source === 'jiosaavn') promises.push(fetchSaavn(cleanQuery));
    if (source === 'all' || source === 'gaana') promises.push(fetchGaana(cleanQuery));

    const settled = await Promise.all(promises);
    
    // Strict priority ordering: YouTube -> Saavn -> Gaana
    settled.forEach(r => results.push(...r));

    return {
      success: true,
      count: results.length,
      results: results
    };
  } catch (error) {
    return { success: false, results: [] };
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    let raw: any[] = [];
    if (data.results) raw = data.results;
    else if (data.contents?.tabbedSearchResultsRenderer) {
      const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
      raw = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.flatMap((s: any) => 
        (s.musicShelfRenderer || s.musicCardShelfRenderer)?.contents || []
      ) || [];
    }

    return raw.map(normalizeYTTrack).filter(t => t.id);
  } catch (e) {
    return [];
  }
}

async function fetchSaavn(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const raw = data.data?.songs?.results || [];
    return raw.map((t: any) => ({
      id: t.id,
      title: t.title || t.name,
      artist: t.primaryArtists || t.artist || "Saavn Artist",
      thumbnail: t.image?.[2]?.url || t.image?.[0]?.url,
      album: t.album || "Saavn Archive",
      duration: t.duration,
      source: 'jiosaavn' as const,
      isYouTube: false
    }));
  } catch (e) { return []; }
}

async function fetchGaana(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const raw = data.data?.songs || [];
    return raw.map((t: any) => ({
      id: t.track_id || t.id,
      title: t.title || t.name,
      artist: t.artists || t.artist || "Gaana Artist",
      thumbnail: t.artworkUrl || t.image,
      duration: t.duration,
      source: 'gaana' as const,
      isYouTube: false
    }));
  } catch (e) { return []; }
}

/**
 * Discovery Manifestations
 */
export async function getTrendingAction(region: string = 'IN') {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/trending?region=${region}`);
    const data = await res.json();
    return (data.results || []).slice(0, 10).map(normalizeYTTrack);
  } catch (e) { return []; }
}

export async function getMusicHomeAction() {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/home`);
    const data = await res.json();
    // Complex mapping for YT Music Home shelves
    const sections = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    return sections.slice(0, 5).map((sec: any) => {
      const shelf = sec.musicCarouselShelfRenderer;
      return {
        title: shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || "Music Pick",
        items: (shelf?.contents || []).map((item: any) => normalizeYTTrack(item.musicTwoRowItemRenderer || item))
      };
    }).filter((s: any) => s.items.length > 0);
  } catch (e) { return []; }
}

export async function getRelatedTracksAction(videoId: string) {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/next/${videoId}`);
    const data = await res.json();
    return (data.results || []).map(normalizeYTTrack);
  } catch (e) { return []; }
}

export async function getPlaylistAction(id: string) {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/playlist/${id}`);
    const data = await res.json();
    return {
      title: data.title || "Playlist",
      tracks: (data.results || []).map(normalizeYTTrack)
    };
  } catch (e) { return null; }
}

export async function getLyricsAction(videoId: string) {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/lyrics/${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.lyrics || null;
  } catch (e) {
    return null;
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  if (track.source === 'youtube' || track.isYouTube) {
    const url = `${YT_MUSIC_API_BASE}/streams/${track.videoId || track.id}`;
    return url;
  }
  
  if (track.source === 'jiosaavn') {
    try {
      const res = await fetch(`${SAAVN_API_BASE}/api/songs/${track.id}`);
      const data = await res.json();
      const links = data.data?.[0]?.downloadUrl;
      return links?.slice(-1)[0]?.url || null;
    } catch (e) { return null; }
  }

  if (track.source === 'gaana') {
    try {
      const res = await fetch(`${GAANA_API_BASE}/api/songs/${track.id}`);
      const data = await res.json();
      return data.data?.[0]?.stream_url || null;
    } catch (e) { return null; }
  }

  return null;
}
