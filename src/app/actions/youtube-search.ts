'use server';

import { Track } from '@/store/usePlayerStore';

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';
const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';

/**
 * Sovereign Safe-Fetch Implementation
 * Reads as raw text first then performs a safe JSON metamorphosis.
 */
async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`%cOracle: Archive Access Denied [${res.status}] at ${url}`, "color: #FF0000; font-weight: bold;");
      return null;
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseError) {
      console.error(`%cOracle: Manifestation Corruption at ${url}`, "color: #FF0000; font-weight: bold;");
      return null;
    }
  } catch (e) {
    console.error(`%cOracle: Network Sanctuary Interrupted at ${url}`, "color: #FF0000; font-weight: bold;");
    return null;
  }
}

/**
 * Normalizes manifestations into the Sovereign Unified Schema
 * Handles ResponsiveListItem, CardShelf, and TwoRowItem renderers with high-fidelity.
 */
function normalizeYTTrack(item: any): Track {
  const renderer = item.musicResponsiveListItemRenderer || 
                   item.musicCardShelfRenderer || 
                   item.musicTwoRowItemRenderer || 
                   item;
  
  // Tiered VideoId Extraction Sanctuary
  let videoId = renderer.videoId || renderer.id;
  if (!videoId && renderer.overlay?.musicItemThumbnailOverlayRenderer) {
    videoId = renderer.overlay.musicItemThumbnailOverlayRenderer
      .content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;
  }
  if (!videoId && renderer.navigationEndpoint?.watchEndpoint?.videoId) {
    videoId = renderer.navigationEndpoint.watchEndpoint.videoId;
  }
  if (!videoId && renderer.onTap?.watchEndpoint?.videoId) {
    videoId = renderer.onTap.watchEndpoint.videoId;
  }

  // Title Extraction Sanctuary
  let title = "Unknown Title";
  if (renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
    title = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
  } else if (renderer.title?.runs?.[0]?.text) {
    title = renderer.title.runs[0].text;
  } else if (typeof renderer.title === 'string') {
    title = renderer.title;
  } else if (renderer.header?.musicCardShelfHeaderRenderer?.title?.runs?.[0]?.text) {
    title = renderer.header.musicCardShelfHeaderRenderer.title.runs[0].text;
  }

  // Artist Extraction Sanctuary
  let artist = "Unknown Artist";
  const flexColumn1 = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
  if (flexColumn1 && flexColumn1.length > 0) {
    artist = flexColumn1.map((r: any) => r.text).join("");
  } else if (renderer.subtitle?.runs) {
    artist = renderer.subtitle.runs.map((r: any) => r.text).join("");
  } else if (renderer.artist?.runs) {
    artist = renderer.artist.runs.map((r: any) => r.text).join("");
  } else if (typeof renderer.artist === 'string') {
    artist = renderer.artist;
  }

  const thumbnail = renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url || 
                    renderer.thumbnails?.[0]?.url || 
                    `https://picsum.photos/seed/${videoId || 'default'}/400/400`;

  const duration = renderer.duration?.text || renderer.duration || "0:00";

  return {
    id: videoId || "unknown_id",
    videoId: videoId,
    title: title || "Unknown Title",
    artist: artist || "Unknown Artist",
    thumbnail: thumbnail,
    duration: duration,
    source: 'youtube' as const,
    isYouTube: true,
    type: (renderer.type || 'song') as any,
    streamUrl: videoId ? `${YT_MUSIC_API_BASE}/streams/${videoId}` : undefined
  };
}

/**
 * Sovereign Unified Search Oracle
 */
export async function searchAllAction(query: string, source: string = 'all') {
  const cleanQuery = query?.toLowerCase().trim();
  if (!cleanQuery) return { success: false, results: [] };

  console.log(`%cOracle: Unified Summons Initiated for "${cleanQuery}"`, "color: #FFD700; font-weight: 900;");

  const results: Track[] = [];

  try {
    // 1. YouTube Music - ABSOLUTE PRIORITY
    if (source === 'all' || source === 'youtube') {
      const ytResults = await fetchYouTubeMusic(cleanQuery);
      results.push(...ytResults);
      console.log(`%cOracle: YouTube Vault Manifested ${ytResults.length} tracks.`, "color: #FFD700;");
    }

    // 2. JioSaavn
    if (source === 'all' || source === 'jiosaavn') {
      const saavnResults = await fetchSaavn(cleanQuery);
      results.push(...saavnResults);
      console.log(`%cOracle: JioSaavn Vault Manifested ${saavnResults.length} tracks.`, "color: #FFD700;");
    }

    // 3. Gaana
    if (source === 'all' || source === 'gaana') {
      const gaanaResults = await fetchGaana(cleanQuery);
      results.push(...gaanaResults);
      console.log(`%cOracle: Gaana Vault Manifested ${gaanaResults.length} tracks.`, "color: #FFD700;");
    }

    return {
      success: true,
      count: results.length,
      results: results
    };
  } catch (error) {
    console.error("Oracle: Unified summons collapsed.", error);
    return { success: false, results: [] };
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
  if (!data) return [];
  
  let raw: any[] = [];
  
  // Recursive extraction for YouTube Music structures
  const findShelves = (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) return obj.flatMap(findShelves);
    
    let items: any[] = [];
    if (obj.musicShelfRenderer?.contents) items.push(...obj.musicShelfRenderer.contents);
    if (obj.musicCardShelfRenderer?.contents) items.push(...obj.musicCardShelfRenderer.contents);
    
    for (const key in obj) {
      if (key !== 'musicShelfRenderer' && key !== 'musicCardShelfRenderer') {
        items.push(...findShelves(obj[key]));
      }
    }
    return items;
  };

  raw = findShelves(data);
  if (raw.length === 0 && Array.isArray(data.results)) raw = data.results;

  return raw
    .map(normalizeYTTrack)
    .filter(t => t.id && t.id !== "unknown_id" && t.title !== "Unknown Title");
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

  // Robust path extraction for Music Home manifestations
  const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                   data.raw_data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                   [];

  return contents.slice(0, 8).map((sec: any) => {
    const shelf = sec.musicCarouselShelfRenderer;
    if (!shelf) return null;
    return {
      title: shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || "Music Pick",
      items: (shelf?.contents || []).map((item: any) => normalizeYTTrack(item.musicTwoRowItemRenderer || item))
    };
  }).filter((s: any) => s && s.items.length > 0);
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
    const id = track.videoId || track.id;
    const playerData = await safeFetch(`${YT_MUSIC_API_BASE}/api/player/${id}`);
    const status = playerData?.player_data?.playabilityStatus?.status;
    
    if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE" || !playerData?.title) {
      console.warn(`%cOracle: Bitstream manifestation blocked [${status}]. Metamorphosing to Video Sanctuary.`, "color: #FFD700; font-weight: bold;");
      return null;
    }

    return `${YT_MUSIC_API_BASE}/streams/${id}`;
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
