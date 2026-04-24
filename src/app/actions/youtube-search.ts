
'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api.onrender.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Hybrid Search Oracle
 * Aggregates JioSaavn (Primary), Gaana (Secondary), and YouTube (Fallback)
 */
export async function searchAllAction(query: string) {
  try {
    const [saavnData, gaanaData] = await Promise.all([
      fetchSaavn(query),
      fetchGaana(query)
    ]);

    // Unified Song List (JioSaavn + Gaana merged)
    const mergedSongs = [...saavnData.songs, ...(gaanaData.songs || [])];
    
    // Check if music archives are empty
    const isMusicEmpty = mergedSongs.length === 0 && (gaanaData.albums?.length || 0) === 0;
    
    let ytResults = [];
    if (isMusicEmpty) {
      ytResults = await fetchYouTube(query);
    }

    return {
      songs: { 
        results: mergedSongs 
      },
      albums: { 
        results: gaanaData.albums || [] 
      },
      artists: { 
        results: gaanaData.artists || [] 
      },
      playlists: { 
        results: gaanaData.playlists || [] 
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
    if (!res.ok) return { songs: [] };
    const data = await res.json();
    const results = data.data || {};
    
    const songs = (results.songs?.results || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.primaryArtists || "Unknown Artist",
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
      album: track.album || "Saavn Vault",
      isSaavn: true,
      source: 'jiosaavn'
    }));

    return { songs };
  } catch (e) {
    return { songs: [] };
  }
}

async function fetchGaana(query: string) {
  try {
    const res = await fetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { songs: [], albums: [], artists: [], playlists: [] };
    const data = await res.json();
    const results = data.data || {};

    const songs = (results.songs || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.artist || "Gaana Artist",
      thumbnail: track.image || track.thumbnail,
      album: track.album || "Gaana Archive",
      isGaana: true,
      source: 'gaana'
    }));

    const albums = (results.albums || []).map((album: any) => ({
      id: album.id,
      title: album.title,
      artist: album.artist || "Gaana Collection",
      thumbnail: album.image,
      type: 'albums',
      source: 'gaana'
    }));

    const artists = (results.artists || []).map((artist: any) => ({
      id: artist.id,
      title: artist.title,
      thumbnail: artist.image,
      type: 'artists',
      source: 'gaana'
    }));

    const playlists = (results.playlists || []).map((pl: any) => ({
      id: pl.id,
      title: pl.title,
      thumbnail: pl.image,
      type: 'playlists',
      source: 'gaana'
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
      isYouTube: true,
      videoId: item.id || item.videoId,
      source: 'youtube'
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
    // Attempt Saavn first, then Gaana
    let res = await fetch(`${SAAVN_API_BASE}/api/${type}/${id}`);
    if (!res.ok) {
        res = await fetch(`${GAANA_API_BASE}/api/${type}/${id}`);
    }
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
    const links = song.downloadUrl;
    const url = links[links.length - 1]?.url || null;
    return url;
  } catch (error) {
    return null;
  }
}
