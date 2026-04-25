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

    // Parallel summons across discovery vaults with individual error sanctuaries
    const [ytResults, saavnResults, gaanaResults] = await Promise.all([
      fetchYouTubeMusic(cleanQuery).catch(e => {
        console.error("%cOracle: YouTube Vault Error:", "color: #FF0000;", e);
        return [];
      }),
      fetchSaavn(cleanQuery).catch(e => {
        console.error("%cOracle: Saavn Vault Error:", "color: #FF0000;", e);
        return [];
      }),
      fetchGaana(cleanQuery).catch(e => {
        console.error("%cOracle: Gaana Vault Error:", "color: #FF0000;", e);
        return [];
      })
    ]);

    console.log(
      `%cOracle: Discovery Results - YT: ${ytResults.length} | Saavn: ${saavnResults.length} | Gaana: ${gaanaResults.length}`,
      "color: #FFD700; font-weight: 700;"
    );

    // Strict Ordering: YT -> Saavn -> Gaana
    const results = [...ytResults, ...saavnResults, ...gaanaResults];

    return {
      success: true,
      query: cleanQuery,
      count: results.length,
      results: results
    };
  } catch (error) {
    console.error("%cOracle: Unified Search Critical Failure:", "color: #FF0000;", error);
    return null;
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${YT_MUSIC_API_BASE}/api/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    // InnerTube Deep Extraction - Searching through common structures
    let rawResults: any[] = [];
    
    if (Array.isArray(data.results)) {
      rawResults = data.results;
    } else if (Array.isArray(data.data)) {
      rawResults = data.data;
    } else if (data.contents?.tabbedSearchResultsRenderer) {
      const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
      const shelfContents = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      rawResults = shelfContents.flatMap((sec: any) => 
        sec.musicShelfRenderer?.contents || sec.musicCardShelfRenderer?.contents || []
      );
    } else if (data.contents?.sectionListRenderer?.contents) {
      rawResults = data.contents.sectionListRenderer.contents.flatMap((sec: any) => 
        sec.musicShelfRenderer?.contents || []
      );
    }
    
    if (rawResults.length === 0) {
      console.warn(`%cOracle: YouTube Vault returned no structured results for "${query}"`, "color: #FFA500;");
    }

    return rawResults.map((item: any) => {
      const track = item.musicResponsiveListItemRenderer || item;
      const id = track.videoId || track.id || track.navigationEndpoint?.watchEndpoint?.videoId;
      if (!id) return null;
      
      const title = track.title?.runs?.[0]?.text || track.title || track.name || "YouTube Track";
      const artist = track.artist?.runs?.[0]?.text || track.author || track.subtitle?.runs?.[0]?.text || "YouTube Music";
      const thumbnail = track.thumbnail?.thumbnails?.[track.thumbnail?.thumbnails?.length - 1]?.url || 
                        track.thumbnail?.thumbnails?.[0]?.url || 
                        track.image || 
                        `https://picsum.photos/seed/${id}/400/400`;
      
      return {
        id: id,
        videoId: id,
        title: title,
        artist: artist,
        thumbnail: thumbnail,
        duration: track.duration?.text || track.duration,
        type: (track.type || 'song') as any,
        source: 'youtube' as const,
        isYouTube: true,
        streamUrl: `${YT_MUSIC_API_BASE}/streams/${id}`,
        url: `https://music.youtube.com/watch?v=${id}`
      };
    }).filter(Boolean) as Track[];
  } catch (e) {
    console.error("%cOracle: YouTube Vault silent.", "color: #FF0000;", e);
    return [];
  }
}

async function fetchSaavn(query: string): Promise<Track[]> {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.data?.songs?.results || data.results || [];
    
    return results.map((track: any) => ({
      id: track.id,
      title: track.title || track.name,
      artist: track.primaryArtists || track.artist || "Saavn Artist",
      thumbnail: track.image?.[2]?.url || track.image?.[1]?.url || track.image?.[0]?.url || track.thumbnail,
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
    const results = data.data?.songs || data.songs || data.results || [];

    return results.map((item: any) => ({
      id: item.track_id || item.id,
      title: item.title || item.name,
      artist: item.artists || item.artist || "Gaana Artist",
      thumbnail: item.artworkUrl || item.image || item.thumbnail,
      duration: item.duration,
      type: 'song' as const,
      source: 'gaana' as const,
      isYouTube: false,
      url: item.song_url || item.url
    }));
  } catch (e) {
    return [];
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  const source = track.source || (track.isYouTube ? 'youtube' : 'jiosaavn');
  
  console.log(`%cOracle: Resolving audio manifestation from ${source.toUpperCase()}`, "color: #FFD700; font-weight: 700;");

  if (source === 'youtube' || track.isYouTube) {
    const id = track.videoId || track.id;
    return `${YT_MUSIC_API_BASE}/streams/${id}`;
  }
  
  if (source === 'gaana') {
    return getGaanaPlaybackUrl(track.id);
  }
  
  if (source === 'jiosaavn' || source === 'saavn') {
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
    // Prefer higher quality
    return links[links.length - 1]?.url || links[0]?.url || null;
  } catch (error) {
    return null;
  }
}

export async function getGaanaPlaybackUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${GAANA_API_BASE}/api/songs/${id}`);
    if (!res.ok) return getSaavnPlaybackUrl(id);
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
