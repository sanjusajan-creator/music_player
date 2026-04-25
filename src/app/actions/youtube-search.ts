'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
const GAANA_API_SEARCH_URL = `${GAANA_API_BASE}/api/search?q=`;

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';

/**
 * Sovereign Query Parser & Normalizer
 */
function parseQuery(query: string) {
  const ytMode = /:yt\b/i.test(query);
  const lyricMode = /:lyrics\b/i.test(query);
  const cleanQuery = query
    .replace(/:yt\b/gi, "")
    .replace(/:lyrics\b/gi, "")
    .trim()
    .toLowerCase();

  return { ytMode, lyricMode, cleanQuery };
}

/**
 * Sovereign Scoring Oracle
 */
function calculateScore(item: Track, query: string) {
  const title = (item.title || "").toLowerCase();
  const artist = (item.artist || "").toLowerCase();
  const q = query.toLowerCase();
  
  let score = 0;

  if (title === q) score += 0.5;
  else if (title.startsWith(q)) score += 0.4;
  else if (title.includes(q)) score += 0.3;

  if (artist === q) score += 0.3;
  else if (artist.includes(q)) score += 0.2;

  if (title === q || artist === q) score += 0.1;
  if (title.startsWith(q)) score += 0.1;

  return score;
}

/**
 * Sovereign Hybrid Search Oracle - YouTube Music Edition
 */
export async function searchAllAction(query: string) {
  try {
    const { ytMode, cleanQuery } = parseQuery(query);
    if (!cleanQuery) return null;

    console.log(`%cOracle: Summoning Unified Archives for "${cleanQuery}"`, "color: #FFD700; font-weight: 900;");

    // Parallel Summoning
    const [saavnResults, gaanaResults, ytResults] = await Promise.all([
      fetchSaavn(cleanQuery).catch(() => []),
      fetchGaana(cleanQuery).catch(() => ({ songs: [] })),
      ytMode ? fetchYouTubeMusic(cleanQuery).catch(() => []) : Promise.resolve([])
    ]);

    // Unified Song List Manifestation
    const allTracks = [
      ...saavnResults,
      ...(gaanaResults.songs || []),
      ...(ytResults || []).filter((t: any) => t.type === 'song' || t.type === 'video')
    ];

    // Sovereign De-duplication & Scoring
    const seen = new Set<string>();
    const scoredTracks = allTracks
      .map(track => ({
        ...track,
        score: calculateScore(track, cleanQuery)
      }))
      .filter(track => {
        const key = `${(track.title || "").toLowerCase()}-${(track.artist || "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      success: true,
      query: cleanQuery,
      count: scoredTracks.length,
      songs: { results: scoredTracks },
      albums: { results: (gaanaResults as any).albums || [] },
      artists: { results: (gaanaResults as any).artists || [] },
      playlists: { results: (gaanaResults as any).playlists || [] },
      videos: { results: (ytResults || []).filter((t: any) => t.type === 'video') },
      ytMode
    };
  } catch (error) {
    console.error("Oracle Unified Search Error:", error);
    return null;
  }
}

async function fetchYouTubeMusic(query: string) {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    // Parse results based on the requested YouTube Music Backend logic
    const results = (data.results || []).map((item: any) => {
      if (!item.videoId && !item.id) return null;
      
      const id = item.videoId || item.id;
      return {
        id: id,
        videoId: id,
        title: item.title,
        artist: item.artist || item.author || "YouTube Music",
        thumbnail: item.thumbnail || item.image,
        duration: item.duration,
        type: item.type || (item.videoId ? 'song' : 'video'),
        source: 'youtube' as const,
        isYouTube: true,
        streamUrl: `${YT_MUSIC_API_BASE}/streams/${id}`,
        url: `https://music.youtube.com/watch?v=${id}`
      };
    }).filter(Boolean);

    return results;
  } catch (e) {
    return [];
  }
}

async function fetchSaavn(query: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs?.results || [];
    
    return results.map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.primaryArtists || "Unknown Artist",
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
      album: track.album || "Saavn Vault",
      url: track.url,
      source: 'jiosaavn' as const,
      isSaavn: true,
      hasLyrics: !!track.hasLyrics
    }));
  } catch (e) {
    return [];
  }
}

async function fetchGaana(query: string) {
  try {
    const res = await fetch(`${GAANA_API_SEARCH_URL}${encodeURIComponent(query)}`);
    if (!res.ok) return { songs: [], albums: [], artists: [], playlists: [] };
    const data = await res.json();
    const results = data.data || {};

    const normalizeGaanaSong = (item: any) => ({
      id: item.track_id || item.id,
      title: item.title,
      artist: item.artists || item.artist || "Gaana Artist",
      album: item.album || "Gaana Archive",
      thumbnail: item.artworkUrl || item.image || "https://via.placeholder.com/150",
      artworkUrl: item.artworkUrl,
      url: item.song_url,
      source: 'gaana' as const,
      isGaana: true
    });

    const songs = (results.songs || []).map(normalizeGaanaSong);
    const albums = (results.albums || []).map((album: any) => ({
      id: album.id,
      title: album.title,
      artist: album.artist || "Gaana Collection",
      thumbnail: album.artworkUrl || album.image,
      artworkUrl: album.artworkUrl,
      type: 'albums',
      source: 'gaana' as const
    }));

    return { songs, albums, artists: results.artists || [], playlists: results.playlists || [] };
  } catch (e) {
    return { songs: [], albums: [], artists: [], playlists: [] };
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  if (track.source === 'youtube' && track.streamUrl) {
    return track.streamUrl;
  }
  if (track.source === 'gaana') {
    const saavnResults = await fetchSaavn(`${track.title} ${track.artist}`);
    if (saavnResults.length > 0) {
      return getSaavnPlaybackUrl(saavnResults[0].id);
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
    if (res.ok) {
      let data = await res.json();
      let song = data?.data?.[0];
      if (song?.lyrics) return song.lyrics;
    }
    if (songUrl) {
      res = await fetch(`${SAAVN_API_BASE}/api/songs?link=${encodeURIComponent(songUrl)}`);
      if (res.ok) {
        let data = await res.json();
        let song = data?.data?.[0];
        if (song?.lyrics) return song.lyrics;
      }
    }
    return null;
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