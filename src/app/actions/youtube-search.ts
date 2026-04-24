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

/**
 * Fetches and normalizes results from the Gaana Vercel Sanctuary.
 */
async function fetchGaana(query: string) {
  try {
    const res = await fetch(`${GAANA_API_SEARCH_URL}${encodeURIComponent(query)}&country=IN`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { songs: [], albums: [], artists: [], playlists: [] };
    const data = await res.json();
    const results = data.data || {};

    // Normalize Gaana song response into unified format BEFORE rendering
    const normalizeGaanaSong = (item: any) => ({
      id: item.track_id || item.id,
      title: item.title,
      artist: item.artists || item.artist || "Gaana Artist",
      album: item.album || "Gaana Archive",
      image: item.artworkUrl,   // IMPORTANT FIX
      artworkUrl: item.artworkUrl,
      thumbnail: item.artworkUrl || item.image || item.thumbnail || "https://via.placeholder.com/150",
      url: item.song_url,
      duration: item.duration,
      source: 'gaana' as const,
      isGaana: true,
      isIndiaContent: true
    });

    const songs = (results.songs || []).map(normalizeGaanaSong);

    const albums = (results.albums || []).map((album: any) => ({
      id: album.id,
      title: album.title,
      artist: album.artist || "Gaana Collection",
      thumbnail: album.artworkUrl || album.image,
      artworkUrl: album.artworkUrl,
      type: 'albums',
      source: 'gaana',
      isIndiaContent: true
    }));

    const artists = (results.artists || []).map((artist: any) => ({
      id: artist.id,
      title: artist.title,
      thumbnail: artist.artworkUrl || artist.image,
      artworkUrl: artist.artworkUrl,
      type: 'artists',
      source: 'gaana',
      isIndiaContent: true
    }));

    const playlists = (results.playlists || []).map((pl: any) => ({
      id: pl.id,
      title: pl.title,
      thumbnail: pl.artworkUrl || pl.image,
      artworkUrl: pl.artworkUrl,
      type: 'playlists',
      source: 'gaana',
      isIndiaContent: true
    }));

    return { songs, albums, artists, playlists };
  } catch (e) {
    return { songs: [], albums: [], artists: [], playlists: [] };
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
