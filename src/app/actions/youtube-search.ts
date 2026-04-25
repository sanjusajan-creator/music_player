'use server';

import { Track } from '@/store/usePlayerStore';

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';
const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';

/**
 * Sovereign Safe-Fetch Implementation
 * Reads as raw text first then performs a safe JSON metamorphosis.
 */
async function safeFetch(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`%cOracle: Resource failed [${res.status}] ${url}`, "color: #FF0000;");
      return null;
    }
    return await res.json();
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      console.warn(`%cOracle: Request timed out > 3000ms for ${url}`, "color: #FF0000;");
    } else {
      console.warn(`%cOracle: Network failure for ${url}`, "color: #FF0000;");
    }
    return null;
  }
}

/**
 * Normalizes manifestations into the Sovereign Unified Schema
 * Handles ResponsiveListItem, CardShelf, and TwoRowItem renderers with high-fidelity.
 */
function normalizeYTTrack(item: any): Track {
  const renderer = item.musicResponsiveListItemRenderer ||
    item.musicCardShelfRenderer ||
    item.musicTwoRowItemRenderer ||
    item;

  // Tiered VideoId Extraction Sanctuary
  let videoId = renderer.videoId || renderer.id;
  if (!videoId && renderer.overlay?.musicItemThumbnailOverlayRenderer) {
    videoId = renderer.overlay.musicItemThumbnailOverlayRenderer
      .content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;
  }
  if (!videoId && renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer) {
    const playEndpoint = renderer.thumbnailOverlay.musicItemThumbnailOverlayRenderer
      .content?.musicPlayButtonRenderer?.playNavigationEndpoint;
    videoId = playEndpoint?.watchEndpoint?.videoId || playEndpoint?.watchPlaylistEndpoint?.videoId || playEndpoint?.watchPlaylistEndpoint?.playlistId;
  }
  if (!videoId && renderer.navigationEndpoint?.watchEndpoint?.videoId) {
    videoId = renderer.navigationEndpoint.watchEndpoint.videoId;
  }
  if (!videoId && renderer.navigationEndpoint?.browseEndpoint?.browseId) {
    videoId = renderer.navigationEndpoint.browseEndpoint.browseId;
  }
  if (!videoId && renderer.onTap?.watchEndpoint?.videoId) {
    videoId = renderer.onTap.watchEndpoint.videoId;
  }

  // Title Extraction Sanctuary
  let title = "Unknown Title";
  if (renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
    title = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
  } else if (renderer.title?.runs?.[0]?.text) {
    title = renderer.title.runs[0].text;
  } else if (typeof renderer.title === 'string') {
    title = renderer.title;
  } else if (renderer.header?.musicCardShelfHeaderRenderer?.title?.runs?.[0]?.text) {
    title = renderer.header.musicCardShelfHeaderRenderer.title.runs[0].text;
  }

  // Artist Extraction Sanctuary
  let artist = "Unknown Artist";
  const flexColumn1 = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
  if (flexColumn1 && flexColumn1.length > 0) {
    artist = flexColumn1.map((r: any) => r.text).join("");
  } else if (renderer.subtitle?.runs) {
    artist = renderer.subtitle.runs.map((r: any) => r.text).join("");
  } else if (renderer.artist?.runs) {
    artist = renderer.artist.runs.map((r: any) => r.text).join("");
  } else if (typeof renderer.artist === 'string') {
    artist = renderer.artist;
  }

  const thumbnail = renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    renderer.thumbnails?.[0]?.url ||
    renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    `https://picsum.photos/seed/${videoId || 'default'}/400/400`;

  const duration = renderer.duration?.text || renderer.duration || "0:00";

  return {
    id: videoId || "unknown_id",
    videoId: videoId,
    title: title || "Unknown Title",
    artist: artist || "Unknown Artist",
    thumbnail: thumbnail,
    duration: duration,
    source: 'youtube' as const,
    isYouTube: true,
    type: (renderer.type || 'song') as any
  };
}

/**
 * Sovereign Unified Search Oracle
 */
export async function searchAllAction(query: string, source: string = 'all') {
  const cleanQuery = query?.toLowerCase().trim();
  if (!cleanQuery) return { success: false, results: [] };

  console.log(`%cOracle: Unified Summons Initiated for "${cleanQuery}"`, "color: #FFD700; font-weight: 900;");

  try {
    // Fetch all sources in parallel — never gate on each other's results
    const [ytResults, saavnResults, gaanaResults] = await Promise.allSettled([
      source === 'all' || source === 'youtube' ? fetchYouTubeMusic(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'jiosaavn' ? fetchSaavn(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'gaana' ? fetchGaana(cleanQuery) : Promise.resolve([]),
    ]);

    const yt = ytResults.status === 'fulfilled' ? ytResults.value : [];
    const saavn = saavnResults.status === 'fulfilled' ? saavnResults.value : [];
    const gaana = gaanaResults.status === 'fulfilled' ? gaanaResults.value : [];

    // Interleave: YT first, then Saavn, then Gaana — so users see variety
    const allResults: Track[] = [];
    const maxLen = Math.max(yt.length, saavn.length, gaana.length);
    for (let i = 0; i < maxLen; i++) {
      if (yt[i]) allResults.push(yt[i]);
      if (saavn[i]) allResults.push(saavn[i]);
      if (gaana[i]) allResults.push(gaana[i]);
    }

    // Deduplicate by title (keep first occurrence)
    const seenTitles = new Set<string>();
    const dedupedResults = allResults.filter(track => {
      const key = track.title.toLowerCase().trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    console.log(`%cOracle: YT=${yt.length} Saavn=${saavn.length} Gaana=${gaana.length} → ${dedupedResults.length} total`, "color: #FFD700;");

    return {
      success: true,
      count: dedupedResults.length,
      results: dedupedResults
    };
  } catch (error) {
    console.error("Oracle: Unified summons collapsed.", error);
    return { success: false, results: [] };
  }
}

async function fetchYouTubeMusic(query: string): Promise<Track[]> {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
  if (!data?.results) return [];

  return data.results.map((item: any) => ({
    id: item.video_id,
    videoId: item.video_id,
    title: item.title || "Unknown Title",
    artist: item.channel?.name || "Unknown Artist",
    thumbnail: item.thumbnail,
    duration: item.duration || "0:00",
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any
  }));
}

async function fetchSaavn(query: string): Promise<Track[]> {
  const data = await safeFetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
  const raw = data?.data?.songs?.results || [];
  return raw.map((t: any) => ({
    id: t.id,
    title: t.title || t.name,
    artist: t.primaryArtists || t.artist || "Saavn Artist",
    thumbnail: t.image?.[2]?.url || t.image?.[1]?.url || t.image?.[0]?.url,
    album: t.album?.name || t.album || "Saavn Archive",
    duration: t.duration,
    source: 'jiosaavn' as const,
    isYouTube: false,
    isSaavn: true,
  }));
}

async function fetchGaana(query: string): Promise<Track[]> {
  const data = await safeFetch(`${GAANA_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  const raw = data?.data?.songs || data?.songs || [];
  return raw.map((t: any) => ({
    id: String(t.track_id || t.id),
    title: t.title || t.name,
    artist: Array.isArray(t.artists) ? t.artists.map((a: any) => a.name || a).join(', ') : (t.artists || t.artist || "Gaana Artist"),
    thumbnail: t.artworkUrl || t.artwork || t.image,
    duration: t.duration,
    source: 'gaana' as const,
    isYouTube: false,
    isGaana: true,
  }));
}

async function fetchSaavnHome(): Promise<Track[]> {
  // Fetch a mix of trending genres from Saavn
  const [trending, bollywood, international] = await Promise.allSettled([
    safeFetch(`${SAAVN_API_BASE}/api/search?query=trending+hindi+2024`),
    safeFetch(`${SAAVN_API_BASE}/api/search?query=bollywood+hits`),
    safeFetch(`${SAAVN_API_BASE}/api/search?query=top+international`),
  ]);

  const allTracks: Track[] = [];
  for (const res of [trending, bollywood, international]) {
    if (res.status === 'fulfilled' && res.value?.data?.songs?.results) {
      const mapped = res.value.data.songs.results.map((t: any) => ({
        id: t.id,
        title: t.title || t.name,
        artist: t.primaryArtists || t.artist || "Saavn Artist",
        thumbnail: t.image?.[2]?.url || t.image?.[0]?.url,
        album: t.album?.name || "",
        duration: t.duration,
        source: 'jiosaavn' as const,
        isYouTube: false,
        isSaavn: true,
      }));
      allTracks.push(...mapped);
    }
  }
  return allTracks;
}

async function fetchGaanaHome(): Promise<Track[]> {
  const [trending, pop] = await Promise.allSettled([
    safeFetch(`${GAANA_API_BASE}/api/search?q=trending+hindi`),
    safeFetch(`${GAANA_API_BASE}/api/search?q=top+pop+songs`),
  ]);

  const allTracks: Track[] = [];
  for (const res of [trending, pop]) {
    if (res.status === 'fulfilled') {
      const raw = res.value?.data?.songs || res.value?.songs || [];
      const mapped = raw.map((t: any) => ({
        id: String(t.track_id || t.id),
        title: t.title || t.name,
        artist: Array.isArray(t.artists) ? t.artists.map((a: any) => a.name || a).join(', ') : (t.artists || "Gaana Artist"),
        thumbnail: t.artworkUrl || t.artwork || t.image,
        duration: t.duration,
        source: 'gaana' as const,
        isYouTube: false,
        isGaana: true,
      }));
      allTracks.push(...mapped);
    }
  }
  return allTracks;
}

export async function getTrendingAction(region: string = 'IN') {
  try {
    const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/trending?region=${region}`);
    if (data?.results && data.results.length > 0) {
      return data.results.slice(0, 10).map((item: any) => ({
        id: item.video_id,
        videoId: item.video_id,
        title: item.title || "Unknown Title",
        artist: item.channel?.name || "Unknown Artist",
        thumbnail: item.thumbnail,
        duration: item.duration || "0:00",
        source: 'youtube' as const,
        isYouTube: true,
        type: 'song' as any
      }));
    }
  } catch (e) {
    console.error("YT Trending failed, falling back to Saavn.");
  }

  // Graceful fallback to Saavn
  const fallback = await fetchSaavn("Trending Hits " + region);
  return fallback.slice(0, 10);
}

export async function getMusicHomeAction() {
  // Fetch YT home + Saavn home + Gaana home all in parallel
  const [ytHomeData, saavnTracks, gaanaTracks] = await Promise.allSettled([
    safeFetch(`${YT_MUSIC_API_BASE}/api/music/home`),
    fetchSaavnHome(),
    fetchGaanaHome(),
  ]);

  const sections: { title: string; items: Track[] }[] = [];

  // Parse YouTube music home
  try {
    const data = ytHomeData.status === 'fulfilled' ? ytHomeData.value : null;
    if (data?.success && data?.data?.contents?.singleColumnBrowseResultsRenderer?.tabs) {
      const tabs = data.data.contents.singleColumnBrowseResultsRenderer.tabs;
      const homeTab = tabs.find((t: any) => t.tabRenderer?.tabIdentifier === 'FEmusic_home') || tabs[0];
      const contents = homeTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of contents) {
        const carousel = section.musicCarouselShelfRenderer;
        if (!carousel?.contents) continue;

        let title = "Trending";
        try {
          title = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.map((r: any) => r.text).join("") || title;
        } catch (e) {}

        const items = carousel.contents.map(normalizeYTTrack).filter((t: Track) => t.id && t.id !== "unknown_id");
        if (items.length > 0) sections.push({ title, items });
      }
    }
  } catch (e) {
    console.error("YT Home parsing failed.", e);
  }

  // Saavn section
  const saavn = saavnTracks.status === 'fulfilled' ? saavnTracks.value : [];
  if (saavn.length > 0) {
    // Chunk into themed sections
    const chunkSize = Math.ceil(saavn.length / 3);
    const labels = ["Trending on JioSaavn", "Bollywood Hits", "Top International"];
    for (let i = 0; i < 3; i++) {
      const chunk = saavn.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) sections.push({ title: labels[i], items: chunk });
    }
  }

  // Gaana section
  const gaana = gaanaTracks.status === 'fulfilled' ? gaanaTracks.value : [];
  if (gaana.length > 0) {
    const chunkSize = Math.ceil(gaana.length / 2);
    const labels = ["Gaana — Trending Hindi", "Gaana — Top Pop"];
    for (let i = 0; i < 2; i++) {
      const chunk = gaana.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) sections.push({ title: labels[i], items: chunk });
    }
  }

  // If everything failed, use Saavn search as final fallback
  if (sections.length === 0) {
    console.log("%cOracle: All sources failed. Using Saavn search fallback.", "color: #FF0000;");
    const fallback = await fetchSaavn("Top Hits");
    return [{ title: "Trending Archives", items: fallback.slice(0, 20) }];
  }

  return sections;
}

export async function getRelatedTracksAction(videoId: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/related?videoId=${videoId}`);
  // Schema: results[] with video_id, title, thumbnail
  return (data?.results || []).map((item: any) => ({
    id: item.video_id,
    videoId: item.video_id,
    title: item.title || "Unknown Title",
    artist: item.channel?.name || "Unknown Artist",
    thumbnail: item.thumbnail,
    duration: item.duration || "0:00",
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any
  })).filter((t: any) => t.id);
}

export async function getPlaylistAction(id: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/playlist?list=${id}`);
  if (!data) return null;
  return {
    title: data.title || "Playlist",
    tracks: (data.results || []).map((item: any) => ({
      id: item.video_id,
      videoId: item.video_id,
      title: item.title || "Unknown Title",
      artist: item.channel?.name || "Unknown Artist",
      thumbnail: item.thumbnail,
      duration: item.duration || "0:00",
      source: 'youtube' as const,
      isYouTube: true,
      type: 'song' as any
    }))
  };
}

export async function getLyricsAction(videoId: string) {
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/lyrics?videoId=${videoId}`);
  return data?.lyrics || null;
}

async function safeFetchStream(url: string, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function resolveTrackAudio(track: Track): Promise<string | null> {
  // Local files: src is already set via ObjectURL in YouTubePlayer
  if (track.isLocal) return null;

  if (track.source === 'youtube' || track.isYouTube) {
    const id = track.videoId || track.id;
    const playerData = await safeFetch(`${YT_MUSIC_API_BASE}/api/video/${id}`);
    if (playerData?.streaming_data?.adaptiveFormats) {
      const audioFormats = playerData.streaming_data.adaptiveFormats.filter((f: any) => f.mimeType?.includes('audio'));
      if (audioFormats.length > 0 && audioFormats[0].url) return audioFormats[0].url;
    }
    if (playerData?.streaming_data?.formats?.length > 0) {
      const fmt = playerData.streaming_data.formats.find((f: any) => f.url);
      if (fmt?.url) return fmt.url;
    }
    return null;
  }

  if (track.source === 'jiosaavn') {
    try {
      const data = await safeFetchStream(`${SAAVN_API_BASE}/api/songs/${track.id}`);
      const links = data?.data?.[0]?.downloadUrl;
      if (links && links.length > 0) {
        // Prefer highest quality (last entry)
        const best = links[links.length - 1]?.url;
        if (best) return best;
      }
    } catch (e) {
      console.warn("Saavn stream resolution failed:", e);
    }
    // Saavn failed — fall back to YouTube search
    return resolveViaYouTubeSearch(track.title, track.artist);
  }

  if (track.source === 'gaana') {
    // Gaana API has no streaming endpoint — search YouTube for the song
    return resolveViaYouTubeSearch(track.title, track.artist);
  }

  return null;
}

/**
 * Fallback: Search YouTube for a song by title+artist and return
 * a special 'yt-fallback:VIDEO_ID' string. The player will detect 
 * this prefix and switch to YouTube iframe playback.
 */
async function resolveViaYouTubeSearch(title: string, artist: string): Promise<string | null> {
  try {
    const query = `${title} ${artist}`.trim();
    const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
    if (data?.results?.[0]?.video_id) {
      return `yt-fallback:${data.results[0].video_id}`;
    }
  } catch (e) {
    console.warn("YouTube fallback search failed:", e);
  }
  return null;
}

export async function directFindAndPlayAction(songName: string) {
  const findUrl = `${YT_MUSIC_API_BASE}/api/search?query=${encodeURIComponent(songName)}`;
  const findRes = await safeFetch(findUrl);

  if (!findRes?.results || findRes.results.length === 0) {
    return { success: false, error: 'No results found' };
  }

  const firstResult = findRes.results[0];
  const videoId = firstResult.video_id;

  if (!videoId) {
    return { success: false, error: 'Could not find video_id' };
  }

  const playerUrl = `${YT_MUSIC_API_BASE}/api/video/${videoId}`;
  const playerRes = await safeFetch(playerUrl);

  if (!playerRes || !playerRes.video_details) {
    return { success: false, error: 'Player data not found' };
  }

  const videoDetails = playerRes.video_details || {};
  const streamingData = playerRes.streaming_data;
  let streamUrl = '';

  if (streamingData?.adaptiveFormats) {
    const audioFormats = streamingData.adaptiveFormats.filter((f: any) => f.mimeType?.includes('audio'));
    if (audioFormats.length > 0) {
      streamUrl = audioFormats[0].url;
    }
  }
  if (!streamUrl && streamingData?.formats?.length > 0) {
    streamUrl = streamingData.formats[0].url;
  }

  const thumbnail = videoDetails.thumbnail?.thumbnails?.slice(-1)?.[0]?.url
    || firstResult.thumbnail
    || `https://picsum.photos/seed/${videoId}/400/400`;

  return {
    success: true,
    track: {
      id: videoId,
      videoId: videoId,
      title: videoDetails.title || firstResult.title || 'Unknown Title',
      artist: videoDetails.author || firstResult.channel?.name || 'Unknown Artist',
      thumbnail: thumbnail,
      duration: videoDetails.lengthSeconds?.toString() || firstResult.duration || "0:00",
      streamUrl: streamUrl,
      source: 'youtube' as const,
      isYouTube: true,
      type: 'song'
    }
  };
}
