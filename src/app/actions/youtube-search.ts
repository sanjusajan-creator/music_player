
'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

/**
 * Sovereign Multi-Search Engine
 * 1. Tries JioSaavn Vault
 * 2. Falls back to YouTube Data API v3 if Saavn is empty
 */
export async function searchAllAction(query: string) {
  try {
    // 1. Manifest from JioSaavn
    const saavnRes = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } 
    });
    if (!saavnRes.ok) throw new Error("Saavn unreachable");
    const saavnData = await saavnRes.json();
    
    // Check if Saavn has songs
    const saavnSongs = saavnData.data?.songs?.results || [];
    
    if (saavnSongs.length === 0 && YT_API_KEY) {
      console.log(`Oracle: Saavn empty for "${query}". Falling back to YouTube...`);
      return await searchYouTubeFallback(query);
    }

    return saavnData.data;
  } catch (error) {
    console.error("Oracle Search Error:", error);
    if (YT_API_KEY) return await searchYouTubeFallback(query);
    return null;
  }
}

/**
 * YouTube Fallback Engine
 */
async function searchYouTubeFallback(query: string) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=15&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    const ytTracks: Track[] = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      album: "YouTube Discovery",
      isYouTube: true,
      isSaavn: false
    }));

    return {
      songs: { results: ytTracks },
      albums: { results: [] },
      artists: { results: [] },
      playlists: { results: [] }
    };
  } catch (e) {
    return null;
  }
}

/**
 * Sovereign Song Manifestation
 */
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

/**
 * Sovereign Album/Playlist Details
 */
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

/**
 * Sovereign Playback Fetcher
 */
export async function getSaavnPlaybackUrl(id: string, quality: 'low' | 'medium' | 'high' | 'auto' = 'auto'): Promise<string | null> {
  try {
    const song = await getSongDetailsAction(id);
    if (!song || !song.downloadUrl) return null;
    const links = song.downloadUrl;
    
    // Select quality index
    // [0]: 12kbps, [1]: 48kbps, [2]: 96kbps, [3]: 160kbps, [4]: 320kbps
    let index = 4; // High default
    if (quality === 'low') index = 1;
    if (quality === 'medium') index = 2;
    if (quality === 'auto') index = 3;

    // Boundary safety
    const finalIndex = Math.min(index, links.length - 1);
    return links[finalIndex]?.url || links[links.length - 1]?.url || null;
  } catch (error) {
    return null;
  }
}
