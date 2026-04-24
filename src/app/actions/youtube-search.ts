'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
const GAANA_API_SEARCH_URL = `${GAANA_API_BASE}/api/search?q=`;

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Query Parser
 * Strips modifiers and returns logic flags
 */
function parseQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  // Support both :yt and yt keywords for robustness
  const ytMode = lowerQuery.includes(":yt") || lowerQuery.includes("yt ");
  const lyricMode = lowerQuery.includes(":lyrics");
  
  const cleanQuery = query
    .replace(/:yt/gi, "")
    .replace(/:lyrics/gi, "")
    .replace(/^yt\s+/gi, "")
    .trim();

  return { ytMode, lyricMode, cleanQuery };
}

/**
 * Sovereign Hybrid Search Oracle - India Optimized
 * Aggregates JioSaavn (Primary), Gaana (Secondary), and YouTube (Explicit Fallback via :yt)
 * Hardened with Fault-Tolerance: One API failure will not kill the manifestation.
 */
export async function searchAllAction(query: string) {
  try {
    const { ytMode, lyricMode, cleanQuery } = parseQuery(query);

    // If no query and no ytMode, return empty
    if (!cleanQuery && !ytMode) return null;

    // Parallel Summoning with Sovereign Fault-Tolerance
    const saavnPromise = cleanQuery ? fetchSaavn(cleanQuery).catch(() => ({ songs: [] })) : Promise.resolve({ songs: [] });
    const gaanaPromise = cleanQuery ? fetchGaana(cleanQuery).catch(() => ({ songs: [], albums: [], artists: [], playlists: [] })) : Promise.resolve({ songs: [], albums: [], artists: [], playlists: [] });
    
    // YouTube Summoning: If ytMode is true and cleanQuery is empty, fetch trending.
    const youtubeQuery = cleanQuery || "Trending Music India";
    const youtubePromise = ytMode ? fetchYouTube(youtubeQuery).catch(() => []) : Promise.resolve([]);

    const [saavnData, gaanaData, ytResults] = await Promise.all([
      saavnPromise,
      gaanaPromise,
      youtubePromise
    ]);

    // Unified Song List (JioSaavn + Gaana merged)
    const allSongs = [...(saavnData.songs || []), ...(gaanaData.songs || [])];
    
    // De-duplication Strategy: Compare Title and Artist
    const seen = new Set<string>();
    const uniqueSongs = allSongs.filter(song => {
      const key = `${song.title.toLowerCase().trim()}-${song.artist.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // If :lyrics is used, prioritize tracks from JioSaavn as they have high-fidelity lyrics
    if (lyricMode) {
      uniqueSongs.sort((a, b) => (a.source === 'jiosaavn' ? -1 : 1));
    }

    return {
      songs: { results: uniqueSongs },
      albums: { results: gaanaData.albums || [] },
      artists: { results: gaanaData.artists || [] },
      playlists: { results: gaanaData.playlists || [] },
      videos: { results: ytResults || [] },
      ytMode,
      lyricMode
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
      url: track.url,
      source: 'jiosaavn' as const,
      isSaavn: true,
      isIndiaContent: true,
      hasLyrics: !!track.hasLyrics
    }));

    return { songs };
  } catch (e) {
    return { songs: [] };
  }
}

async function fetchGaana(query: string) {
  try {
    const res = await fetch(`${GAANA_API_SEARCH_URL}${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { songs: [], albums: [], artists: [], playlists: [] };
    const data = await res.json();
    const results = data.data || {};

    const normalizeGaanaSong = (item: any) => ({
      id: item.track_id || item.id,
      title: item.title,
      artist: item.artists || item.artist || "Gaana Artist",
      album: item.album || "Gaana Archive",
      image: item.artworkUrl,
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
      source: 'gaana' as const,
      isIndiaContent: true
    }));

    const artists = (results.artists || []).map((artist: any) => ({
      id: artist.id,
      title: artist.title,
      thumbnail: artist.artworkUrl || artist.image,
      artworkUrl: artist.artworkUrl,
      type: 'artists',
      source: 'gaana' as const,
      isIndiaContent: true
    }));

    const playlists = (results.playlists || []).map((pl: any) => ({
      id: pl.id,
      title: pl.title,
      thumbnail: pl.artworkUrl || pl.image,
      artworkUrl: pl.artworkUrl,
      type: 'playlists',
      source: 'gaana' as const,
      isIndiaContent: true
    }));

    return { songs, albums, artists, playlists };
  } catch (e) {
    return { songs: [], albums: [], artists: [], playlists: [] };
  }
}

async function fetchYouTube(query: string) {
  if (!RAPIDAPI_KEY) {
    console.warn("Oracle: YouTube RapidAPI Key missing. Fallback Discovery disabled.");
    return [];
  }
  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(query)}&regionCode=IN&hl=en-IN`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      },
      next: { revalidate: 86400 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    // RapidAPI response can be an array directly or inside a results property
    const items = Array.isArray(data) ? data : (data.results || []);

    return items.map((v: any) => ({
      id: v.videoId || v.id,
      videoId: v.videoId || v.id,
      title: v.title,
      artist: v.channelTitle || "YouTube Discovery",
      thumbnail: v.thumbnail?.[0]?.url || v.thumbnail || "https://via.placeholder.com/150",
      source: 'youtube' as const,
      isYouTube: true,
      url: `https://www.youtube.com/watch?v=${v.videoId || v.id}`,
      isIndiaContent: true
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  if (track.source === 'gaana') {
    const saavnResults = await fetchSaavn(`${track.title} ${track.artist}`);
    if (saavnResults.songs.length > 0) {
      return getSaavnPlaybackUrl(saavnResults.songs[0].id);
    }
    return null; 
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

export async function getLyricsAction(songId: string, songUrl?: string) {
  try {
    let res = await fetch(`${SAAVN_API_BASE}/api/songs/${songId}`);
    if (!res.ok) return null;
    let data = await res.json();
    let song = data?.data?.[0];

    if (song?.lyrics) return song.lyrics;

    if (songUrl || song?.url) {
      const urlToFetch = songUrl || song?.url;
      res = await fetch(`${SAAVN_API_BASE}/api/songs?link=${encodeURIComponent(urlToFetch)}`);
      if (res.ok) {
        data = await res.json();
        const fallbackSong = data?.data?.[0];
        if (fallbackSong?.lyrics) return fallbackSong.lyrics;
      }
    }

    return null;
  } catch (error) {
    console.error("Oracle Lyrics Fetch Error:", error);
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