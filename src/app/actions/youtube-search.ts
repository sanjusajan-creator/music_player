'use server';

import { Track } from '@/store/usePlayerStore';

const YT_MUSIC_API_BASE = 'https://yt-api-2lez.onrender.com';
const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';
const GAANA_API_BASE = 'https://my-gaana-api-tau.vercel.app';

/**
 * Sovereign Safe-Fetch Implementation
 * Reads as raw text first then performs a safe JSON metamorphosis.
 */
async function safeFetch(url: string, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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

  // ── VideoId Extraction ────────────────────────────────────────────
  let videoId: string | undefined = renderer.videoId || renderer.id;
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

  // ── Title Extraction ──────────────────────────────────────────────
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

  // ── Artist/Subtitle Extraction ────────────────────────────────────
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

  // ── Thumbnail Extraction ──────────────────────────────────────────
  // musicResponsiveListItemRenderer stores thumbnail as thumbnail.musicThumbnailRenderer.thumbnail.thumbnails
  const thumbnail =
    renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    (typeof renderer.thumbnail === 'string' && renderer.thumbnail.startsWith('http') ? renderer.thumbnail : null) ||
    renderer.thumbnails?.[0]?.url ||
    renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    (videoId && !videoId.startsWith('UC') && !videoId.startsWith('MPR') && !videoId.startsWith('RD') && !videoId.startsWith('PL')
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : `https://picsum.photos/seed/${videoId || 'default'}/400/400`);

  const duration = renderer.duration?.text || renderer.duration || "0:00";

  // ── Type Detection ────────────────────────────────────────────────
  // Use only structural signals — NEVER text heuristics on subtitle (subtitle has song names, views, dates etc.)
  const pageType = renderer.navigationEndpoint?.browseEndpoint
    ?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

  let type = 'song';
  if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
    type = 'artist';
  } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK') {
    type = 'album';
  } else if (
    pageType === 'MUSIC_PAGE_TYPE_PLAYLIST' ||
    renderer.navigationEndpoint?.watchPlaylistEndpoint ||
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchPlaylistEndpoint
  ) {
    type = 'playlist';
  } else if (renderer.type) {
    type = renderer.type.toLowerCase();
  }
  // If we got a browseId that looks like a channel (UCxxx) and type wasn't explicitly set to song, mark as artist
  if (videoId?.startsWith('UC') && type === 'song') {
    type = 'artist';
  }

  // Strip VL prefix from playlist IDs
  if (type === 'playlist' && videoId?.startsWith('VL')) {
    videoId = videoId.substring(2);
  }

  return {
    id: videoId || "unknown_id",
    videoId: type === 'song' ? videoId : undefined,
    title: title || "Unknown Title",
    artist: artist || "Unknown Artist",
    thumbnail,
    duration,
    source: 'youtube' as const,
    isYouTube: true,
    type: type as any
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
    const [ytResults, saavnSongs, saavnAlbums, saavnPlaylists, gaanaResults] = await Promise.allSettled([
      source === 'all' || source === 'youtube' ? fetchYouTubeMusic(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'jiosaavn' ? fetchSaavn(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'jiosaavn' ? fetchSaavnAlbums(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'jiosaavn' ? fetchSaavnPlaylists(cleanQuery) : Promise.resolve([]),
      source === 'all' || source === 'gaana' ? fetchGaana(cleanQuery) : Promise.resolve([]),
    ]);

    const yt = ytResults.status === 'fulfilled' ? ytResults.value : [];
    const sSongs = saavnSongs.status === 'fulfilled' ? saavnSongs.value : [];
    const sAlbums = saavnAlbums.status === 'fulfilled' ? saavnAlbums.value : [];
    const sPlaylists = saavnPlaylists.status === 'fulfilled' ? saavnPlaylists.value : [];
    const gaana = gaanaResults.status === 'fulfilled' ? gaanaResults.value : [];

    // Interleave everything
    const allResults: Track[] = [];
    const maxLen = Math.max(yt.length, sSongs.length, sAlbums.length, sPlaylists.length, gaana.length);
    for (let i = 0; i < maxLen; i++) {
      if (yt[i]) allResults.push(yt[i]);
      if (sSongs[i]) allResults.push(sSongs[i]);
      if (sPlaylists[i]) allResults.push(sPlaylists[i]);
      if (sAlbums[i]) allResults.push(sAlbums[i]);
      if (gaana[i]) allResults.push(gaana[i]);
    }

    // Deduplicate by title + type
    const seenKeys = new Set<string>();
    const dedupedResults = allResults.filter(track => {
      const key = `${track.title.toLowerCase().trim()}-${track.type || 'song'}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Sort: YT songs first → other songs → playlists → albums → artists
    dedupedResults.sort((a, b) => {
      const getScore = (t: Track) => {
        const type = t.type || 'song';
        const isYT = t.source === 'youtube';
        if (type === 'song' || type === 'video') return isYT ? 100 : 90;
        if (type === 'playlist') return 70;
        if (type === 'album') return 60;
        if (type === 'artist') return 50;
        return 0;
      };
      return getScore(b) - getScore(a);
    });

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
  try {
    const musicData = await safeFetch(`${YT_MUSIC_API_BASE}/api/music/search?query=${encodeURIComponent(query)}`);
    const tracks: Track[] = [];
    
    if (musicData?.raw_data?.contents?.tabbedSearchResultsRenderer?.tabs) {
       const tabs = musicData.raw_data.contents.tabbedSearchResultsRenderer.tabs;
       const tab = tabs[0];
       const contents = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
       
       for (const section of contents) {
          if (section.musicShelfRenderer?.contents) {
             for (const item of section.musicShelfRenderer.contents) {
                const t = normalizeYTTrack(item);
                if (t.id && t.id !== "unknown_id") tracks.push(t);
             }
          }
          if (section.musicCardShelfRenderer) {
             const t = normalizeYTTrack(section.musicCardShelfRenderer);
             if (t.id && t.id !== "unknown_id") tracks.push(t);
          }
       }
    }
    
    if (tracks.length > 0) return tracks;
  } catch (e) {
    console.error("YT Music search parsing failed", e);
  }

  // Fallback to legacy endpoint if music search fails or returns nothing
  const data = await safeFetch(`${YT_MUSIC_API_BASE}/api/search?query=${encodeURIComponent(query)}`);
  if (!data?.results) return [];

  return data.results.map((item: any) => ({
    id: item.video_id || item.playlist_id || item.browse_id || item.id,
    videoId: item.video_id,
    title: item.title || "Unknown Title",
    artist: item.channel?.name || item.author || "Unknown Artist",
    thumbnail: item.thumbnail,
    duration: item.duration || "0:00",
    source: 'youtube' as const,
    isYouTube: true,
    type: (item.type || 'song').toLowerCase() as any
  }));
}

async function fetchSaavn(query: string): Promise<Track[]> {
  const data = await safeFetch(`${SAAVN_API_BASE}/api/search/songs?query=${encodeURIComponent(query)}`);
  const raw = data?.data?.results || [];
  return raw.map((t: any) => ({
    id: t.id,
    title: t.name || t.title,
    artist: t.primaryArtists || t.artist || "Saavn Artist",
    thumbnail: t.image?.[2]?.url || t.image?.[1]?.url || t.image?.[0]?.url,
    album: t.album?.name || t.album || "Saavn Archive",
    duration: t.duration,
    source: 'jiosaavn' as const,
    isYouTube: false,
    isSaavn: true,
    type: 'song' as any
  }));
}

async function fetchSaavnAlbums(query: string): Promise<Track[]> {
  const data = await safeFetch(`${SAAVN_API_BASE}/api/search/albums?query=${encodeURIComponent(query)}`);
  const raw = data?.data?.results || [];
  return raw.map((t: any) => ({
    id: t.id,
    title: t.name || t.title,
    artist: t.artist || "Saavn Artist",
    thumbnail: t.image?.[2]?.url || t.image?.[0]?.url,
    source: 'jiosaavn' as const,
    isYouTube: false,
    isSaavn: true,
    type: 'album' as any
  }));
}

async function fetchSaavnPlaylists(query: string): Promise<Track[]> {
  const data = await safeFetch(`${SAAVN_API_BASE}/api/search/playlists?query=${encodeURIComponent(query)}`);
  const raw = data?.data?.results || [];
  return raw.map((t: any) => ({
    id: t.id,
    title: t.name || t.title,
    artist: t.firstname || "Saavn Curator",
    thumbnail: t.image?.[2]?.url || t.image?.[0]?.url,
    source: 'jiosaavn' as const,
    isYouTube: false,
    isSaavn: true,
    type: 'playlist' as any
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
    type: 'song' as any
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

const YT_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function runsToText(runs: any[] | undefined): string {
  if (!Array.isArray(runs)) return '';
  return runs.map((run) => (typeof run?.text === 'string' ? run.text : '')).join('').trim();
}

function readText(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return runsToText(value);
  if (!value || typeof value !== 'object') return '';
  if (typeof value.simpleText === 'string') return value.simpleText.trim();
  if (typeof value.text === 'string') return value.text.trim();
  if (typeof value.content === 'string') return value.content.trim();
  if (Array.isArray(value.runs)) return runsToText(value.runs);
  if (value.text) return readText(value.text);
  return '';
}

function pickFirstText(...values: any[]): string | undefined {
  for (const value of values) {
    const text = readText(value);
    if (text) return text;
  }
  return undefined;
}

function normalizeArtistText(value: string | undefined): string {
  if (!value) return '';
  const firstSegment = value.replace(/\s*•\s*/g, '|').split('|')[0];
  return firstSegment.replace(/\s+/g, ' ').trim();
}

function extractThumbnailUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.startsWith('http') ? value : undefined;

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const url = extractThumbnailUrl(value[i]);
      if (url) return url;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  if (typeof value.url === 'string' && value.url.startsWith('http')) {
    return value.url;
  }

  const candidates = [
    value.sources,
    value.thumbnails,
    value.thumbnail,
    value.thumbnail?.thumbnails,
    value.thumbnail?.sources,
    value.musicThumbnailRenderer?.thumbnail?.thumbnails,
    value.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
    value.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails,
    value.heroImage?.contentPreviewImageViewModel?.image?.sources,
    value.contentPreviewImageViewModel?.image?.sources,
  ];

  for (const candidate of candidates) {
    const url = extractThumbnailUrl(candidate);
    if (url) return url;
  }

  return undefined;
}

function secondsToDuration(value: any): string | undefined {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function isYouTubeVideoId(value: any): value is string {
  return typeof value === 'string' && YT_VIDEO_ID_RE.test(value);
}

function collectNodesByKey(root: any, key: string): any[] {
  if (!root) return [];

  const found: any[] = [];
  const stack: any[] = [root];
  const visited = new WeakSet<object>();

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === 'object') stack.push(item);
      }
      continue;
    }

    const record = node as Record<string, any>;
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const candidate = record[key];
      if (Array.isArray(candidate)) found.push(...candidate);
      else found.push(candidate);
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return found;
}

function mapLegacyTrack(item: any, fallbackArtist = 'Unknown Artist'): Track | null {
  const videoId = item?.video_id || item?.videoId;
  if (!isYouTubeVideoId(videoId)) return null;

  return {
    id: videoId,
    videoId,
    title: pickFirstText(item?.title) || 'Unknown Title',
    artist: normalizeArtistText(pickFirstText(item?.channel?.name, item?.author, item?.artist)) || fallbackArtist,
    thumbnail: extractThumbnailUrl(item?.thumbnail) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: pickFirstText(item?.duration) || '0:00',
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any,
  };
}

function mapPlaylistVideoRendererTrack(renderer: any, fallbackArtist = 'Unknown Artist'): Track | null {
  const videoId = renderer?.videoId || renderer?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!isYouTubeVideoId(videoId)) return null;

  return {
    id: videoId,
    videoId,
    title: pickFirstText(renderer?.title) || 'Unknown Title',
    artist: normalizeArtistText(pickFirstText(renderer?.shortBylineText, renderer?.longBylineText, renderer?.ownerText)) || fallbackArtist,
    thumbnail: extractThumbnailUrl(renderer?.thumbnail) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: pickFirstText(renderer?.lengthText, secondsToDuration(renderer?.lengthSeconds)) || '0:00',
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any,
  };
}

function mapMusicResponsiveRendererTrack(renderer: any, fallbackArtist = 'Unknown Artist'): Track | null {
  const playEndpoint =
    renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
    renderer?.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
    renderer?.playNavigationEndpoint ||
    renderer?.navigationEndpoint ||
    renderer?.onTap;

  const videoId =
    playEndpoint?.watchEndpoint?.videoId ||
    renderer?.navigationEndpoint?.watchEndpoint?.videoId ||
    renderer?.videoId;

  if (!isYouTubeVideoId(videoId)) return null;

  const title =
    pickFirstText(
      renderer?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text,
      renderer?.title
    ) || 'Unknown Title';

  const artist =
    normalizeArtistText(
      pickFirstText(
        renderer?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text,
        renderer?.subtitle,
        renderer?.artist
      )
    ) || fallbackArtist;

  const duration =
    pickFirstText(
      renderer?.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text,
      renderer?.durationText,
      renderer?.duration,
      secondsToDuration(renderer?.lengthSeconds)
    ) || '0:00';

  return {
    id: videoId,
    videoId,
    title,
    artist,
    thumbnail:
      extractThumbnailUrl(renderer?.thumbnail) ||
      extractThumbnailUrl(renderer?.thumbnailRenderer) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration,
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any,
  };
}

function mapMusicTwoRowRendererTrack(renderer: any, fallbackArtist = 'Unknown Artist'): Track | null {
  const playEndpoint =
    renderer?.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
    renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
    renderer?.navigationEndpoint ||
    renderer?.onTap;

  const videoId = playEndpoint?.watchEndpoint?.videoId || renderer?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!isYouTubeVideoId(videoId)) return null;

  return {
    id: videoId,
    videoId,
    title: pickFirstText(renderer?.title) || 'Unknown Title',
    artist: normalizeArtistText(pickFirstText(renderer?.subtitle, renderer?.longBylineText)) || fallbackArtist,
    thumbnail:
      extractThumbnailUrl(renderer?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails) ||
      extractThumbnailUrl(renderer?.thumbnail) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: '0:00',
    source: 'youtube' as const,
    isYouTube: true,
    type: 'song' as any,
  };
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const deduped: Track[] = [];

  for (const track of tracks) {
    const key = track.videoId || track.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(track);
  }

  return deduped;
}

function extractSongTracks(payload: any, fallbackArtist = 'Unknown Artist'): Track[] {
  const tracks: Track[] = [];

  if (Array.isArray(payload?.results)) {
    for (const item of payload.results) {
      const track = mapLegacyTrack(item, fallbackArtist);
      if (track) tracks.push(track);
    }
  }

  for (const renderer of collectNodesByKey(payload, 'playlistVideoRenderer')) {
    const track = mapPlaylistVideoRendererTrack(renderer, fallbackArtist);
    if (track) tracks.push(track);
  }

  for (const renderer of collectNodesByKey(payload, 'musicResponsiveListItemRenderer')) {
    const track = mapMusicResponsiveRendererTrack(renderer, fallbackArtist);
    if (track) tracks.push(track);
  }

  for (const renderer of collectNodesByKey(payload, 'musicTwoRowItemRenderer')) {
    const track = mapMusicTwoRowRendererTrack(renderer, fallbackArtist);
    if (track) tracks.push(track);
  }

  return dedupeTracks(tracks);
}

function parsePlaylistPayload(payload: any, playlistId: string, fallbackTitle = 'Playlist') {
  const title =
    pickFirstText(
      payload?.title,
      payload?.data?.title,
      payload?.data?.metadata?.playlistMetadataRenderer?.title,
      payload?.data?.microformat?.microformatDataRenderer?.title,
      payload?.data?.header?.musicResponsiveHeaderRenderer?.title,
      payload?.data?.header?.musicDetailHeaderRenderer?.title,
      payload?.data?.header?.musicImmersiveHeaderRenderer?.title,
      payload?.data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.pageHeaderViewModel?.title?.dynamicTextViewModel?.text?.content
    ) || fallbackTitle;

  const artist =
    normalizeArtistText(
      pickFirstText(
        payload?.author,
        payload?.ownerName,
        payload?.data?.metadata?.playlistMetadataRenderer?.ownerName,
        payload?.data?.sidebar?.playlistSidebarRenderer?.items?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title,
        payload?.data?.header?.musicDetailHeaderRenderer?.subtitle,
        payload?.data?.header?.musicResponsiveHeaderRenderer?.subtitle
      )
    ) || 'Unknown Artist';

  const thumbnail =
    extractThumbnailUrl(payload?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicResponsiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicDetailHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicImmersiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer) ||
    `https://picsum.photos/seed/${playlistId}/400/400`;

  const tracks = extractSongTracks(payload, artist);

  return { title, thumbnail, artist, tracks };
}

function parseAlbumPayload(payload: any, albumId: string) {
  const title =
    pickFirstText(
      payload?.title,
      payload?.data?.title,
      payload?.data?.header?.musicResponsiveHeaderRenderer?.title,
      payload?.data?.header?.musicDetailHeaderRenderer?.title,
      payload?.data?.header?.musicImmersiveHeaderRenderer?.title,
      payload?.data?.metadata?.playlistMetadataRenderer?.title,
      payload?.data?.microformat?.microformatDataRenderer?.title
    ) || 'Unknown Album';

  const artist =
    normalizeArtistText(
      pickFirstText(
        payload?.artist,
        payload?.author,
        payload?.data?.header?.musicResponsiveHeaderRenderer?.subtitle,
        payload?.data?.header?.musicDetailHeaderRenderer?.subtitle,
        payload?.data?.header?.musicImmersiveHeaderRenderer?.subtitle,
        payload?.data?.metadata?.playlistMetadataRenderer?.ownerName,
        payload?.data?.sidebar?.playlistSidebarRenderer?.items?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title
      )
    ) || 'Unknown Artist';

  const thumbnail =
    extractThumbnailUrl(payload?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicResponsiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicDetailHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicImmersiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer) ||
    `https://picsum.photos/seed/${albumId}/400/400`;

  const tracks = extractSongTracks(payload, artist);

  return { title, artist, thumbnail, tracks };
}

function parseArtistPayload(payload: any, artistId: string) {
  const name =
    pickFirstText(
      payload?.name,
      payload?.artist,
      payload?.data?.header?.musicImmersiveHeaderRenderer?.title,
      payload?.data?.header?.musicVisualHeaderRenderer?.title,
      payload?.data?.header?.musicDetailHeaderRenderer?.title,
      payload?.data?.header?.musicResponsiveHeaderRenderer?.title,
      payload?.data?.metadata?.channelMetadataRenderer?.title,
      payload?.data?.microformat?.microformatDataRenderer?.title
    ) || 'Unknown Artist';

  const thumbnail =
    extractThumbnailUrl(payload?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicImmersiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicVisualHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicDetailHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.header?.musicResponsiveHeaderRenderer?.thumbnail) ||
    extractThumbnailUrl(payload?.data?.metadata?.channelMetadataRenderer?.avatar) ||
    `https://picsum.photos/seed/${artistId}/400/400`;

  const tracks = extractSongTracks(payload, name);

  return { name, thumbnail, tracks };
}

function getPlaylistIdCandidates(id: string): string[] {
  const clean = id?.trim();
  if (!clean) return [];

  const candidates = new Set<string>([clean]);
  if (clean.startsWith('VL') && clean.length > 2) {
    candidates.add(clean.substring(2));
  } else {
    candidates.add(`VL${clean}`);
  }

  return Array.from(candidates);
}

function getIdCandidates(id: string): string[] {
  const clean = id?.trim();
  if (!clean) return [];

  const candidates = new Set<string>([clean]);
  if (clean.startsWith('VL') && clean.length > 2) {
    candidates.add(clean.substring(2));
  }

  return Array.from(candidates);
}

async function fetchPlaylistDetails(playlistId: string, fallbackTitle = 'Playlist') {
  let fallback: { title: string; thumbnail: string; artist: string; tracks: Track[] } | null = null;

  for (const candidateId of getPlaylistIdCandidates(playlistId)) {
    const encodedId = encodeURIComponent(candidateId);
    const urls = [
      `${YT_MUSIC_API_BASE}/api/playlist/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/music/playlist/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/playlist?list=${encodedId}`,
    ];

    for (const url of urls) {
      const payload = await safeFetch(url);
      if (!payload) continue;

      const parsed = parsePlaylistPayload(payload, candidateId, fallbackTitle);
      if (!fallback) fallback = parsed;

      if (parsed.tracks.length > 0) {
        return parsed;
      }
    }
  }

  return fallback;
}

export async function getPlaylistAction(id: string) {
  const details = await fetchPlaylistDetails(id, 'Playlist');
  if (!details) return null;

  return {
    title: details.title,
    thumbnail: details.thumbnail,
    tracks: details.tracks,
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
    if (!id) return null;
    
    const playerData = await safeFetch(`${YT_MUSIC_API_BASE}/api/video/${id}`, 10000);
    
    if (playerData?.streaming_data) {
      const sd = playerData.streaming_data;
      
      // Prefer adaptiveFormats audio-only (highest quality first)
      if (sd.adaptiveFormats?.length) {
        const audioFormats = sd.adaptiveFormats
          .filter((f: any) => f.mimeType?.includes('audio') && f.url)
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        if (audioFormats.length > 0) return audioFormats[0].url;
      }
      
      // Fallback to combined formats that have a URL
      if (sd.formats?.length) {
        const fmt = sd.formats.find((f: any) => f.url);
        if (fmt?.url) return fmt.url;
      }
    }
    
    // If API has streaming data but no usable URL, or no data — fall back to iframe
    return `yt-fallback:${id}`;
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

export async function getArtistAction(artistId: string) {
  const parsed = await fetchArtistDetails(artistId);
  if (!parsed) return null;
  return {
    name: parsed.name,
    thumbnail: parsed.thumbnail,
    tracks: parsed.tracks,
  };
}

async function fetchArtistDetails(artistId: string) {
  let fallback: { name: string; thumbnail: string; tracks: Track[] } | null = null;
  let lastParsed: { name: string; thumbnail: string; tracks: Track[] } | null = null;

  for (const candidateId of getIdCandidates(artistId)) {
    const encodedId = encodeURIComponent(candidateId);
    const urls = [
      `${YT_MUSIC_API_BASE}/api/music/artist/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/channel/${encodedId}`,
    ];

    for (const url of urls) {
      const payload = await safeFetch(url);
      if (!payload) continue;

      const parsed = parseArtistPayload(payload, candidateId);
      lastParsed = parsed;
      if (!fallback) fallback = parsed;

      if (parsed.name !== 'Unknown Artist') {
        return parsed;
      }
    }

    const currentParsed = lastParsed || fallback;

    if (candidateId.startsWith('UC') && !candidateId.startsWith('HC') && !candidateId.startsWith('MPRE')) {
      const uploadsId = candidateId.replace(/^UC/, 'UU');
      const playlistDetails = await fetchPlaylistDetails(uploadsId, currentParsed?.name || 'Uploads');
      if (playlistDetails && playlistDetails.tracks.length > 0) {
        return {
          name: playlistDetails.artist || currentParsed?.name || 'Unknown Artist',
          thumbnail: playlistDetails.thumbnail,
          tracks: playlistDetails.tracks,
        };
      }
    }
  }

  return fallback;
}

export async function getAlbumAction(albumId: string) {
  const parsed = await fetchAlbumDetails(albumId);
  if (!parsed) return null;
  return {
    title: parsed.title,
    artist: parsed.artist,
    thumbnail: parsed.thumbnail,
    tracks: parsed.tracks,
  };
}

async function fetchAlbumDetails(albumId: string) {
  let fallback: { title: string; artist: string; thumbnail: string; tracks: Track[] } | null = null;

  for (const candidateId of getIdCandidates(albumId)) {
    const encodedId = encodeURIComponent(candidateId);
    const urls = [
      `${YT_MUSIC_API_BASE}/api/music/album/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/playlist/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/music/playlist/${encodedId}`,
      `${YT_MUSIC_API_BASE}/api/playlist?list=${encodedId}`,
    ];

    for (const url of urls) {
      const payload = await safeFetch(url);
      if (!payload) continue;

      const parsed = parseAlbumPayload(payload, candidateId);
      if (!fallback) fallback = parsed;

      if (parsed.tracks.length > 0) {
        return parsed;
      }
    }
  }

  return fallback;
}

export async function getPlaylistSearchAction(playlistId: string) {
  const details = await fetchPlaylistDetails(playlistId, 'Playlist');
  if (!details) return null;
  return {
    title: details.title,
    thumbnail: details.thumbnail,
    tracks: details.tracks,
  };
}
