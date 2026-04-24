'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Unified Search Oracle
 * Aggregates JioSaavn (Audio), Gaana (Metadata), and YouTube (Fallback Video)
 */
export async function searchAllAction(query: string) {
  try {
    const [saavnData, ytResults] = await Promise.all([
      fetchSaavn(query),
      fetchYouTube(query)
    ]);

    // Format results into a unified Spotify-like structure
    return {
      songs: { 
        results: saavnData.songs 
      },
      albums: { 
        results: saavnData.albums 
      },
      artists: { 
        results: saavnData.artists 
      },
      playlists: { 
        results: saavnData.playlists 
      },
      videos: {
        results: ytResults
      }
    };
  } catch (error) {
    console.error("Oracle Unified Search Error:", error);
    return null;
  }
}

async function fetchSaavn(query: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } 
    });
    if (!res.ok) return { songs: [], albums: [], artists: [], playlists: [] };
    const data = await res.json();
    const results = data.data || {};
    
    const songs = (results.songs?.results || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.primaryArtists || "Unknown Artist",
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
      album: track.album || "Saavn Vault",
      isSaavn: true,
      isYouTube: false
    }));

    const albums = (results.albums?.results || []).map((album: any) => ({
      id: album.id,
      title: album.title,
      artist: album.artist || "Various Artists",
      thumbnail: album.image?.[2]?.url,
      type: 'albums'
    }));

    const artists = (results.artists?.results || []).map((artist: any) => ({
      id: artist.id,
      title: artist.title,
      thumbnail: artist.image?.[2]?.url,
      type: 'artists'
    }));

    const playlists = (results.playlists?.results || []).map((pl: any) => ({
      id: pl.id,
      title: pl.title,
      thumbnail: pl.image?.[2]?.url,
      type: 'playlists'
    }));

    return { songs, albums, artists, playlists };
  } catch (e) {
    return { songs: [], albums: [], artists: [], playlists: [] };
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
    const items = data.items || data.search_results || [];
    
    return items.slice(0, 10).map((item: any) => ({
      id: item.id || item.videoId,
      title: item.title,
      artist: item.channelTitle || item.author || "YouTube Discovery",
      thumbnail: item.thumbnail?.url || item.thumbnails?.[0]?.url,
      album: "YouTube Video Discovery",
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

export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const song = await getSongDetailsAction(id);
    if (!song || !song.downloadUrl) return null;
    // Strictly use .url from the highest quality stream
    const links = song.downloadUrl;
    const url = links[links.length - 1]?.url || null;
    return url;
  } catch (error) {
    return null;
  }
}
