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
 * Sovereign Unified Search Oracle - Combined Manifestation
 * STRICT ORDERING: YouTube -> JioSaavn -> Gaana
 */
export async function searchAllAction(queryInput: string, source: 'jiosaavn' | 'gaana' | 'youtube' | 'all' = 'all') {
  try {
    const { cleanQuery } = parseQuery(queryInput);
    if (!cleanQuery) return null;

    console.log(`%cOracle: Summoning Archives for "${cleanQuery}" (Priority: YouTube > Saavn > Gaana)`, "color: #FFD700; font-weight: 900;");

    // Perform summons in parallel for maximum velocity
    const requests = [
      fetchYouTubeMusic(cleanQuery).catch(() => []),
      fetchSaavn(cleanQuery).catch(() => []),
      fetchGaana(cleanQuery).catch(() => [])
    ];

    const [ytResults, saavnResults, gaanaResults] = await Promise.all(requests);

    // Merge in STRICT ORDER: YT -> Saavn -> Gaana
    const orderedTracks = [...ytResults, ...saavnResults, ...gaanaResults];

    // De-duplicate manifestations
    const seen = new Set<string>();
    const filteredTracks = orderedTracks.filter(track => {
      const key = `${track.source}-${track.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`%cOracle: Manifested ${filteredTracks.length} tracks.`, "color: #FFD700; font-weight: 900;");

    return {
      success: true,
      query: cleanQuery,
      count: filteredTracks.length,
      results: filteredTracks
    };
  } catch (error) {
    console.error("Oracle Unified Search Error:", error);
    return null;
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    // Support diverse InnerTube response structures
    const rawResults = data.results || data.data || [];
    
    return rawResults.map((item: any) => {
      const id = item.videoId || item.id;
      if (!id) return null;
      
      return {
        id: id,
        videoId: id,
        title: item.title || item.name,
        artist: item.artist || item.author || item.subtitle || "YouTube Music",
        thumbnail: item.thumbnail || item.thumbnails?.[0]?.url || `https://picsum.photos/seed/${id}/400/400`,
        duration: item.duration,
        type: (item.type || 'song') as any,
        source: 'youtube' as const,
        isYouTube: true,
        streamUrl: `${YT_MUSIC_API_BASE}/streams/${id}`,
        url: `https://music.youtube.com/watch?v=${id}`
      };
    }).filter(Boolean) as Track[];
  } catch (e) {
    console.error("Oracle: YouTube Vault silent.", e);
    return [];
  }
}

async function fetchSaavn(query: string): Promise<Track[]> {
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
    const res = await fetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs || [];

    return results.map((item: any) => ({
      id: item.track_id || item.id,
      title: item.title,
      artist: item.artists || "Gaana Artist",
      album: item.album || "Gaana Archive",
      thumbnail: item.artworkUrl || item.image,
      duration: item.duration,
      type: 'song' as const,
      source: 'gaana' as const,
      url: item.song_url
    }));
  } catch (e) {
    return [];
  }
}

export async function getTrendingAction() {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/trending?region=IN`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 10).map((v: any) => ({
      id: v.videoId,
      videoId: v.videoId,
      title: v.title,
      artist: v.author || "Trending",
      thumbnail: v.thumbnail || v.thumbnails?.[0]?.url,
      duration: v.duration,
      source: 'youtube' as const,
      isYouTube: true
    }));
  } catch (e) {
    return [];
  }
}

export async function getRelatedTracksAction(videoId: string) {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/next/${videoId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((v: any) => ({
      id: v.videoId || v.id,
      videoId: v.videoId || v.id,
      title: v.title,
      artist: v.author || v.artist || "Related",
      thumbnail: v.thumbnail || v.thumbnails?.[0]?.url,
      duration: v.duration,
      source: 'youtube' as const,
      isYouTube: true
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  if (track.isYouTube || track.source === 'youtube') {
    return `${YT_MUSIC_API_BASE}/streams/${track.id || track.videoId}`;
  }
  
  if (track.source === 'gaana' || track.source === 'jiosaavn') {
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
    let res = await fetch(`${SAAVN_API_BASE}/api/songs?id=${songId}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.lyrics) return data.data[0].lyrics;
    }
    if (songUrl) {
      res = await fetch(`${SAAVN_API_BASE}/api/songs?link=${encodeURIComponent(songUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.[0]?.lyrics) return data.data[0].lyrics;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getDetailAction(type: 'albums' | 'playlists' | 'artists', id: string) {
  try {
    let endpoint = type === 'albums' ? 'album' : type === 'playlists' ? 'playlist' : 'artist';
    if (id.length === 11 || id.startsWith('PL') || id.startsWith('RD')) {
       const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/${endpoint}/${id}`);
       if (res.ok) {
         const data = await res.json();
         return data || null;
       }
    }
    
    let res = await fetch(`${SAAVN_API_BASE}/api/${type}/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    return null;
  }
}
