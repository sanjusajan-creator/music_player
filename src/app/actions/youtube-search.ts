'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
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
 * Implementation of the Intelligent Best Match Ranking.
 */
function calculateScore(item: Track, query: string) {
  const title = (item.title || "").toLowerCase();
  const artist = (item.artist || "").toLowerCase();
  const q = query.toLowerCase();
  
  let score = 0;

  // Exact Match Bonuses
  if (title === q) score += 0.5;
  if (artist === q) score += 0.3;

  // Prefix Bonuses
  if (title.startsWith(q)) score += 0.4;
  
  // Fuzzy/Inclusion
  if (title.includes(q)) score += 0.2;
  if (artist.includes(q)) score += 0.1;

  return score;
}

/**
 * Sovereign Unified Search Oracle - Combined Manifestation
 */
export async function searchAllAction(queryInput: string, source: 'jiosaavn' | 'gaana' | 'youtube' | 'all' = 'all') {
  try {
    const { ytMode, cleanQuery } = parseQuery(queryInput);
    if (!cleanQuery) return null;

    console.log(`%cOracle: Summoning Unified Archives for "${cleanQuery}" [Source: ${source}]`, "color: #FFD700; font-weight: 900;");

    // Parallel Summoning with Fault-Tolerance
    const requests = [];
    
    if (source === 'all' || source === 'jiosaavn') {
      requests.push(fetchSaavn(cleanQuery).catch(() => []));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (source === 'all' || source === 'gaana') {
      requests.push(fetchGaana(cleanQuery).catch(() => []));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (source === 'all' || source === 'youtube' || ytMode) {
      requests.push(fetchYouTubeMusic(cleanQuery).catch(() => []));
    } else {
      requests.push(Promise.resolve([]));
    }

    const [saavnResults, gaanaResults, ytResults] = await Promise.all(requests);

    // Unified Song List Manifestation
    const allTracks = [
      ...saavnResults,
      ...gaanaResults,
      ...ytResults
    ];

    // Sovereign De-duplication, Scoring & Filtering
    const seen = new Set<string>();
    const scoredTracks = allTracks
      .filter(track => track.title && track.id) // Filter bad data
      .map(track => ({
        ...track,
        score: calculateScore(track, cleanQuery)
      }))
      .filter(track => {
        const key = `${track.source}-${track.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      success: true,
      query: cleanQuery,
      count: scoredTracks.length,
      results: scoredTracks, // Unified flat results as requested
      // Keeping these for view compatibility if needed
      songs: { results: scoredTracks }, 
      albums: { results: [] }, // Filtered or specialized search can populate these
      ytMode
    };
  } catch (error) {
    console.error("Oracle Unified Search Error:", error);
    return null;
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    // Normalization: Using q= for YouTube
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    const results = data.results || data.data || [];
    return results.map((item: any) => {
      const id = item.videoId || item.id;
      if (!id) return null;
      
      // Mapping: title -> runs[0].text (if raw) or title, artist -> subtitle/author
      return {
        id: id,
        title: item.title || item.name || "YouTube Manifestation",
        artist: item.artist || item.author || item.subtitle || "YouTube Music",
        thumbnail: item.thumbnail || item.thumbnails?.[0]?.url || item.image,
        duration: item.duration,
        type: (item.type || (item.videoId ? 'song' : 'video')) as any,
        source: 'youtube' as const,
        streamUrl: `${YT_MUSIC_API_BASE}/streams/${id}`,
        url: `https://music.youtube.com/watch?v=${id}`
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function fetchSaavn(query: string): Promise<Track[]> {
  try {
    // Normalization: Using query= for Saavn
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs?.results || [];
    
    return results.map((track: any) => ({
      id: track.id,
      title: track.title || track.name,
      artist: track.primaryArtists || "Unknown Artist",
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
      album: track.album || "Saavn Vault",
      duration: track.duration,
      type: 'song' as const,
      source: 'jiosaavn' as const,
      url: track.url,
      hasLyrics: !!track.hasLyrics
    }));
  } catch (e) {
    return [];
  }
}

async function fetchGaana(query: string): Promise<Track[]> {
  try {
    // Normalization: Using keyword= (simulated via q= for the specific API proxy)
    const res = await fetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs || [];

    return results.map((item: any) => ({
      id: item.track_id || item.id,
      title: item.title,
      artist: item.artists || item.artist || "Gaana Artist",
      album: item.album || "Gaana Archive",
      thumbnail: item.artworkUrl || item.image || item.thumbnails?.[0]?.url,
      duration: item.duration,
      type: 'song' as const,
      source: 'gaana' as const,
      url: item.song_url
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  // Already normalized streamUrl for YouTube
  if (track.source === 'youtube' && track.streamUrl) {
    return track.streamUrl;
  }
  
  if (track.source === 'gaana' || track.source === 'jiosaavn') {
    // Both resolved via Saavn vault for high-fidelity bitstreams
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
    // Prefer highest quality
    return links[links.length - 1]?.url || links[0]?.url || null;
  } catch (error) {
    return null;
  }
}

export async function getLyricsAction(songId: string, songUrl?: string) {
  try {
    let res = await fetch(`${SAAVN_API_BASE}/api/songs?id=${songId}`);
    if (res.ok) {
      let data = await res.json();
      let lyrics = data?.data?.[0]?.lyrics;
      if (lyrics) return lyrics;
    }
    if (songUrl) {
      res = await fetch(`${SAAVN_API_BASE}/api/songs?link=${encodeURIComponent(songUrl)}`);
      if (res.ok) {
        let data = await res.json();
        let lyrics = data?.data?.[0]?.lyrics;
        if (lyrics) return lyrics;
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
