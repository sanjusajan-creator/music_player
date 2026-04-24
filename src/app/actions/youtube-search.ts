'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
const GAANA_API_SEARCH_URL = `${GAANA_API_BASE}/api/search?q=`;

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Hybrid Search Oracle - India Optimized
 * Aggregates JioSaavn (Primary), Gaana (Secondary), and YouTube (Fallback)
 */
export async function searchAllAction(query: string) {
  try {
    const [saavnData, gaanaData] = await Promise.all([
      fetchSaavn(query),
      fetchGaana(query)
    ]);

    // Unified Song List (JioSaavn + Gaana merged)
    const allSongs = [...saavnData.songs, ...(gaanaData.songs || [])];
    
    // De-duplication Strategy: Compare Title and Artist
    const seen = new Set<string>();
    const uniqueSongs = allSongs.filter(song => {
      const key = `${song.title.toLowerCase().trim()}-${song.artist.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    let ytResults = [];
    // Only fetch YouTube if music archives are dry or for discovery
    if (uniqueSongs.length < 5) {
      ytResults = await fetchYouTube(query);
    }

    return {
      songs: { results: uniqueSongs },
      albums: { results: gaanaData.albums || [] },
      artists: { results: gaanaData.artists || [] },
      playlists: { results: gaanaData.playlists || [] },
      videos: { results: ytResults }
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
      source: 'jiosaavn',
      isSaavn: true,
      isIndiaContent: true
    }));

    return { songs };
  } catch (e) {
    return { songs: [] };
  }
}

async function fetchGaana(query: string) {
  try {
    const res = await fetch(`${GAANA_API_SEARCH_URL}${encodeURIComponent(query)}&country=IN`, {
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
      source: 'gaana',
      isGaana: true,
      isIndiaContent: true
    }));

    const albums = (results.albums || []).map((album: any) => ({
      id: album.id,
      title: album.title,
      artist: album.artist || "Gaana Collection",
      thumbnail: album.image,
      type: 'albums',
      source: 'gaana',
      isIndiaContent: true
    }));

    const artists = (results.artists || []).map((artist: any) => ({
      id: artist.id,
      title: artist.title,
      thumbnail: artist.image,
      type: 'artists',
      source: 'gaana',
      isIndiaContent: true
    }));

    const playlists = (results.playlists || []).map((pl: any) => ({
      id: pl.id,
      title: pl.title,
      thumbnail: pl.image,
      type: 'playlists',
      source: 'gaana',
      isIndiaContent: true
    }));

    return { songs, albums, artists, playlists };
  } catch (e) {
    return { songs: [], albums: [], artists: [], playlists: [] };
  }
}

async function fetchYouTube(query: string): Promise<Track[]> {
  if (!RAPIDAPI_KEY) return [];
  try {
    const url = `https://${RAPIDAPI_HOST}/search/?query=${encodeURIComponent(query)}&regionCode=IN&hl=en-IN`;
    const res = await fetch(url, {
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
      album: "YouTube Discovery (IN)",
      source: 'youtube',
      isYouTube: true,
      videoId: item.id || item.videoId,
      isIndiaContent: true
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  // If Gaana, try to resolve from Saavn first
  if (track.source === 'gaana') {
    const saavnResults = await fetchSaavn(`${track.title} ${track.artist}`);
    if (saavnResults.songs.length > 0) {
      // Return highest quality stream from matched Saavn track
      return getSaavnPlaybackUrl(saavnResults.songs[0].id);
    }
    return null; // Fallback to YouTube handled in Player component
  }
  
  if (track.source === 'jiosaavn') {
    return getSaavnPlaybackUrl(track.id);
  }

  return null;
}

export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    const song = data.data?.[0];
    if (!song || !song.downloadUrl) return null;
    
    const links = song.downloadUrl;
    return links[links.length - 1]?.url || links[0]?.url || null;
  } catch (error) {
    return null;
  }
}

export async function getDetailAction(type: 'albums' | 'playlists' | 'artists', id: string) {
  try {
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
