'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
const GAANA_API_SEARCH_URL = `${GAANA_API_BASE}/api/search?q=`;

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'youtube-data16.p.rapidapi.com';

/**
 * Sovereign Query Parser & Normalizer
 * Strips modifiers and cleanses noise for high-fidelity matching.
 */
function parseQuery(query: string) {
  const cleanQuery = query
    .replace(/:yt\b/gi, "")
    .replace(/:lyrics\b/gi, "")
    .trim()
    .toLowerCase();

  const ytMode = /:yt\b/i.test(query);
  const lyricMode = /:lyrics\b/i.test(query);

  return { ytMode, lyricMode, cleanQuery };
}

/**
 * Sovereign Scoring Oracle
 * Calculates a relevance score for a manifestation based on the clean query.
 */
function calculateScore(item: Track, query: string) {
  const title = item.title.toLowerCase();
  const artist = item.artist.toLowerCase();
  const q = query.toLowerCase();
  
  let score = 0;

  // Title Similarity (0.5 weight)
  if (title === q) score += 0.5;
  else if (title.startsWith(q)) score += 0.4;
  else if (title.includes(q)) score += 0.3;

  // Artist Similarity (0.3 weight)
  if (artist === q) score += 0.3;
  else if (artist.includes(q)) score += 0.2;

  // Exact Match Bonus (0.1 weight)
  if (title === q || artist === q) score += 0.1;

  // Start-of-string Bonus (0.1 weight)
  if (title.startsWith(q)) score += 0.1;

  return score;
}

/**
 * Sovereign Hybrid Search Oracle - Intelligent Ranking Edition
 */
export async function searchAllAction(query: string) {
  try {
    const { ytMode, cleanQuery } = parseQuery(query);
    if (!cleanQuery) return null;

    console.log(`%cOracle: Summoning Unified Archives for "${cleanQuery}"`, "color: #FFD700; font-weight: 900;");

    // Parallel Summoning
    const [saavnResults, gaanaResults, ytResults] = await Promise.all([
      fetchSaavn(cleanQuery).catch(e => { console.error("Saavn Vault unreachable", e); return []; }),
      fetchGaana(cleanQuery).catch(e => { console.error("Gaana Sanctuary unreachable", e); return { songs: [] }; }),
      ytMode ? fetchYouTube(cleanQuery).catch(e => { console.error("YouTube Discovery silent", e); return []; }) : Promise.resolve([])
    ]);

    // Unified Song List Manifestation
    const allTracks = [
      ...saavnResults,
      ...(gaanaResults.songs || [])
    ];

    // Sovereign De-duplication & Scoring
    const seen = new Set<string>();
    const scoredTracks = allTracks
      .map(track => ({
        ...track,
        score: calculateScore(track, cleanQuery)
      }))
      .filter(track => {
        const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Debug Manifestation
    console.log(`%cOracle Debug: Best Match [${scoredTracks[0]?.title}] Score: ${scoredTracks[0]?.score}`, "color: #C9A227; font-weight: 900;");

    return {
      songs: { results: scoredTracks },
      albums: { results: (gaanaResults as any).albums || [] },
      artists: { results: (gaanaResults as any).artists || [] },
      playlists: { results: (gaanaResults as any).playlists || [] },
      videos: { results: ytResults || [] },
      ytMode
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
      isIndiaContent: true,
      hasLyrics: !!track.hasLyrics
    }));
  } catch (e) {
    return [];
  }
}

async function fetchGaana(query: string) {
  try {
    const url = `${GAANA_API_SEARCH_URL}${encodeURIComponent(query)}`;
    console.log(`%cOracle: Dispatching Gaana Summon [${url}]`, "color: #FFD700;");
    
    const res = await fetch(url, {
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
      thumbnail: item.artworkUrl || item.image || "https://via.placeholder.com/150",
      artworkUrl: item.artworkUrl,
      url: item.song_url,
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
      source: 'gaana' as const
    }));

    return { songs, albums, artists: results.artists || [], playlists: results.playlists || [] };
  } catch (e) {
    console.error("Oracle: Gaana fetch error", e);
    return { songs: [], albums: [], artists: [], playlists: [] };
  }
}

async function fetchYouTube(query: string) {
  if (!RAPIDAPI_KEY) return [];
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
    
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data.results) items = data.results;
    else if (data.contents) items = data.contents;
    else if (data.data) items = data.data;

    return items.map((v: any) => {
      const videoId = v.videoId || v.id?.videoId || (typeof v.id === 'string' ? v.id : null);
      if (!videoId) return null;
      return {
        id: videoId,
        videoId: videoId,
        title: v.title || v.snippet?.title || "YouTube Discovery",
        artist: v.channelTitle || v.snippet?.channelTitle || "YouTube",
        thumbnail: v.thumbnail?.[0]?.url || v.thumbnail || v.snippet?.thumbnails?.high?.url,
        source: 'youtube' as const,
        isYouTube: true,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isIndiaContent: true
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
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
