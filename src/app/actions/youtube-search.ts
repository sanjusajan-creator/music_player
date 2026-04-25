'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';
const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';

/**
 * Sovereign Query Normalizer
 */
function normalizeQuery(query: string) {
  return query
    .replace(/:yt\b/gi, "")
    .replace(/:lyrics\b/gi, "")
    .trim()
    .toLowerCase();
}

/**
 * Sovereign Unified Search Oracle - [YouTube > Saavn > Gaana]
 */
export async function searchAllAction(queryInput: string) {
  try {
    const cleanQuery = normalizeQuery(queryInput);
    if (!cleanQuery) return null;

    console.log(`%cOracle: Summoning Unified Archives for "${cleanQuery}"`, "color: #FFD700; font-weight: 900;");

    // Parallel summons across discovery vaults
    const requests = [
      fetchYouTubeMusic(cleanQuery).catch(() => []),
      fetchSaavn(cleanQuery).catch(() => []),
      fetchGaana(cleanQuery).catch(() => [])
    ];

    const [ytResults, saavnResults, gaanaResults] = await Promise.all(requests);

    // Strict Ordering: YT -> Saavn -> Gaana
    const results = [...ytResults, ...saavnResults, ...gaanaResults];

    return {
      success: true,
      query: cleanQuery,
      count: results.length,
      results: results
    };
  } catch (error) {
    console.error("Oracle: Unified Search Error:", error);
    return null;
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    // InnerTube Deep Extraction
    let rawResults = data.results || data.data || [];
    
    // Fallback: Check for tabbedSearchResultsRenderer structure
    if (rawResults.length === 0 && data.contents?.tabbedSearchResultsRenderer) {
      const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
      const firstTab = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      rawResults = firstTab.flatMap((sec: any) => 
        sec.musicShelfRenderer?.contents || sec.musicCardShelfRenderer?.contents || []
      );
    }
    
    return rawResults.map((item: any) => {
      const track = item.musicResponsiveListItemRenderer || item;
      const id = track.videoId || track.id || track.navigationEndpoint?.watchEndpoint?.videoId;
      if (!id) return null;
      
      return {
        id: id,
        videoId: id,
        title: track.title?.runs?.[0]?.text || track.title || track.name || "YouTube Track",
        artist: track.artist?.runs?.[0]?.text || track.author || track.subtitle?.runs?.[0]?.text || "YouTube Music",
        thumbnail: track.thumbnail?.thumbnails?.[0]?.url || track.image || `https://picsum.photos/seed/${id}/400/400`,
        duration: track.duration?.text || track.duration,
        type: (track.type || 'song') as any,
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
      isYouTube: false,
      url: track.url
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
      thumbnail: item.artworkUrl || item.image,
      duration: item.duration,
      type: 'song' as const,
      source: 'gaana' as const,
      isYouTube: false,
      url: item.song_url
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  const isYT = track.isYouTube || track.source === 'youtube' || (track.id && track.id.length === 11);
  
  if (isYT) {
    return `${YT_MUSIC_API_BASE}/streams/${track.id || track.videoId}`;
  }
  
  if (track.source === 'gaana') {
    return getGaanaPlaybackUrl(track.id);
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

export async function getGaanaPlaybackUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${GAANA_API_BASE}/api/songs/${id}`);
    if (!res.ok) {
       // Fallback to Saavn if ID structures overlap or for testing
       return getSaavnPlaybackUrl(id);
    }
    const data = await res.json();
    const song = data.data?.[0] || data.data;
    if (!song) return null;
    return song.stream_url || song.downloadUrl?.[0]?.url || null;
  } catch (e) {
    return getSaavnPlaybackUrl(id);
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

export async function getLyricsAction(songId: string, songUrl?: string) {
  try {
    let res = await fetch(`${SAAVN_API_BASE}/api/songs?id=${songId}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.lyrics) return data.data[0].lyrics;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getDetailAction(type: 'albums' | 'playlists' | 'artists', id: string) {
  try {
    const isYT = id.length === 11 || id.startsWith('PL') || id.startsWith('RD');
    let endpoint = type === 'albums' ? 'album' : type === 'playlists' ? 'playlist' : 'artist';
    
    if (isYT) {
       const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/${endpoint}/${id}`);
       if (res.ok) {
         const data = await res.json();
         return data || null;
       }
    }
    
    const res = await fetch(`${SAAVN_API_BASE}/api/${type}/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    return null;
  }
}