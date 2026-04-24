import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Sovereign Search Strategy (Innertune-inspired):
 * 1. YouTube Data API (If key available)
 * 2. Piped Public Instance (Real YouTube results without key)
 * 3. Audius Grid (High-Fidelity Full Tracks)
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

  // Tier 1: YouTube Official (If key present)
  if (YOUTUBE_API_KEY) {
    try {
      console.log("Oracle: Summoning from YouTube Archive...");
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' official audio')}&type=video&maxResults=15&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
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
            thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.standard?.url || item.snippet.thumbnails.high?.url || `https://i.ytimg.com/vi/${item.id}/maxresdefault.jpg`,
            duration: parseISO8601Duration(item.contentDetails.duration),
          }));
          
          updateCache(cacheKey, results);
          return results;
        }
      }
    } catch (error) {}
  }

  // Tier 2: Piped API (Real YouTube Results, No Key)
  try {
    console.log("Oracle: Manifesting via Piped Grid...");
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.video',
      'https://pipedapi.leptons.xyz'
    ];
    
    for (const instance of pipedInstances) {
      try {
        const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_videos`);
        if (!res.ok) continue;
        const data = await res.json();
        
        if (data.items?.length > 0) {
          const results = data.items.slice(0, 15).map((item: any) => ({
            id: item.url.split('v=')[1],
            title: normalizeMetadata(item.title),
            artist: normalizeMetadata(item.uploaderName),
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url.split('v=')[1]}/maxresdefault.jpg`,
            duration: item.duration || 0,
          }));
          
          updateCache(cacheKey, results);
          return results;
        }
      } catch (e) { continue; }
    }
  } catch (e) {}

  // Tier 3: Audius Grid (Universal Fallback)
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
  if (!videoId || videoId.length !== 11 || videoId.includes('-')) {
    return MOCK_TRACKS;
  }
  
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
    if (!res.ok) return MOCK_TRACKS;
    const data = await res.json();
    
    return (data.relatedItems || []).slice(0, 10).map((item: any) => ({
      id: item.url.split('v=')[1],
      title: normalizeMetadata(item.title),
      artist: normalizeMetadata(item.uploaderName),
      thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url.split('v=')[1]}/maxresdefault.jpg`,
      duration: item.duration || 0,
    }));
  } catch (error) {
    return MOCK_TRACKS;
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
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/maxresdefault.jpg', duration: 185 },
];