import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Innertune-inspired Sovereign Search Strategy:
 * 1. Official YouTube Music Vault (Prioritized for mainstream accuracy and HD thumbnails)
 * 2. Audius Decentralized Grid (High-Fidelity Full Tracks)
 * 3. Jamendo / Archive.org (Universal Archive Fallbacks)
 */
export async function searchTracks(query: string): Promise<Track[]> {
  const sanitizedQuery = query?.toLowerCase().trim();
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');
  
  // 1. Check Firestore Cache Sanctuary
  try {
    const db = getDb();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL) {
        console.log("Oracle: Summoned from Cache Sanctuary.");
        return data.results;
      }
    }
  } catch (e) {}

  // Tier 1: YouTube Music Vault (Official Archive Priority)
  if (YOUTUBE_API_KEY) {
    try {
      console.log("Oracle: Summoning from YouTube Archive...");
      // Innertune Technique: Force 'official audio' and music category (10)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' official audio')}&type=video&maxResults=15&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.status === 403) throw new Error("QUOTA_EXCEEDED");
      
      const searchData = await searchRes.json();
      const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean).join(',') || '';
      
      if (videoIds) {
        const listUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        
        const results = (listData.items || []).map((item: any) => ({
          id: item.id,
          title: normalizeMetadata(item.snippet.title),
          artist: normalizeMetadata(item.snippet.channelTitle),
          // Innertune Technique: Strictly prioritize High-Resolution artwork
          thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.standard?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
          duration: parseISO8601Duration(item.contentDetails.duration),
        }));
        
        console.log(`Oracle: Manifested ${results.length} official tracks from YouTube.`);
        updateCache(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.warn("Oracle: YouTube Archive restricted. Falling back to public grids.");
    }
  }

  // Tier 2: Audius Decentralized Grid (Full Songs)
  try {
    console.log("Oracle: Summoning full tracks from Audius...");
    const res = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=VIBECRAFT`);
    const data = await res.json();
    if (data.data?.length > 0) {
      const results = data.data.map((item: any) => ({
        id: `audius-${item.id}`,
        title: item.title,
        artist: item.user.name,
        thumbnail: item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || 'https://picsum.photos/seed/audius/400/400',
        duration: Math.floor(item.duration),
        previewUrl: `https://api.audius.co/v1/tracks/${item.id}/stream?app_name=VIBECRAFT`
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // Tier 3: Jamendo Open Archive
  try {
    const jamendoUrl = `https://api.jamendo.com/v2.0/tracks/?client_id=56d30cce&format=jsonsearch&limit=15&search=${encodeURIComponent(query)}`;
    const res = await fetch(jamendoUrl);
    const data = await res.json();
    if (data.results?.length > 0) {
      const results = data.results.map((item: any) => ({
        id: `jamendo-${item.id}`,
        title: item.name,
        artist: item.artist_name,
        thumbnail: item.album_image || item.image || 'https://picsum.photos/seed/jamendo/400/400',
        duration: item.duration,
        previewUrl: item.audio
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  return getMockResults(sanitizedQuery);
}

function updateCache(key: string, results: Track[]) {
  try {
    const db = getDb();
    setDoc(doc(db, "search_cache", key), {
      results,
      timestamp: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
}

export async function getRelatedVideos(videoId: string): Promise<Track[]> {
  // SOVEREIGN SHIELD: Don't call YouTube API for non-YouTube IDs (it causes 403s)
  if (!videoId || videoId.length !== 11 || videoId.includes('-')) {
    return MOCK_TRACKS.slice(0, 5);
  }
  
  if (!YOUTUBE_API_KEY) return MOCK_TRACKS.slice(0, 5);
  
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.status === 403) return MOCK_TRACKS.slice(0, 5);
    const searchData = await searchRes.json();
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean).join(',') || '';
    if (!videoIds) return MOCK_TRACKS.slice(0, 5);
    const listUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    return (listData.items || []).map((item: any) => ({
      id: item.id,
      title: normalizeMetadata(item.snippet.title),
      artist: normalizeMetadata(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.standard?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      duration: parseISO8601Duration(item.contentDetails.duration),
    }));
  } catch (error) {
    return MOCK_TRACKS.slice(0, 5);
  }
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return (hours * 3600) + (minutes * 60) + seconds;
}

function normalizeMetadata(text: string): string {
  if (!text) return "";
  // Innertune Technique: Purge noisy metadata for high-fidelity UI
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\(Official Video\)/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\(Official Lyric Video\)/gi, '')
    .replace(/\[Official Video\]/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .replace(/VEVO/gi, '')
    .trim();
}

function getMockResults(query: string): Track[] {
  const filtered = MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
  return filtered.length > 0 ? filtered : MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://picsum.photos/seed/rick/600/600', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://picsum.photos/seed/nirvana/600/600', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://picsum.photos/seed/gold/600/600', duration: 185 },
];