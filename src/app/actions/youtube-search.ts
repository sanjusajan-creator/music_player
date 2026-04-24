'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Hybrid Search Engine
 * Merges results from JioSaavn (Audio) and YouTube RapidAPI (Discovery)
 */
export async function searchAllAction(query: string) {
  try {
    const [saavnResults, ytResults] = await Promise.all([
      fetchSaavn(query),
      fetchYouTube(query)
    ]);

    return {
      songs: { 
        results: [...(saavnResults || []), ...(ytResults || [])] 
      },
      albums: { results: [] },
      artists: { results: [] },
      playlists: { results: [] }
    };
  } catch (error) {
    console.error("Oracle Search Error:", error);
    return null;
  }
}

async function fetchSaavn(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } 
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs?.results || [];
    
    return results.map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.primaryArtists || track.artist,
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
      album: track.album || "Saavn Vault",
      isSaavn: true,
      isYouTube: false
    }));
  } catch (e) {
    return [];
  }
}

async function fetchYouTube(query: string): Promise<Track[]> {
  if (!RAPIDAPI_KEY) return [];
  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}/search/?query=${encodeURIComponent(query)}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    // RapidAPI response usually has items or similar structure
    const items = data.items || data.search_results || [];
    
    return items.slice(0, 10).map((item: any) => ({
      id: item.id || item.videoId,
      title: item.title,
      artist: item.channelTitle || item.author,
      thumbnail: item.thumbnail?.url || item.thumbnails?.[0]?.url,
      album: "YouTube Discovery",
      isSaavn: false,
      isYouTube: true,
      videoId: item.id || item.videoId
    }));
  } catch (e) {
    return [];
  }
}

export async function getSongDetailsAction(id: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch (e) {
    return null;
  }
}

export async function getDetailAction(type: 'albums' | 'playlists' | 'artists', id: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/${type}/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    return null;
  }
}

export async function getSaavnPlaybackUrl(id: string, quality: 'low' | 'medium' | 'high' | 'auto' = 'auto'): Promise<string | null> {
  try {
    const song = await getSongDetailsAction(id);
    if (!song || !song.downloadUrl) return null;
    
    const links = song.downloadUrl;
    // Strictly use .url property per user instructions
    const url = links[links.length - 1]?.url || links[links.length - 1]?.link || null;
    return url;
  } catch (error) {
    return null;
  }
}
