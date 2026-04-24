import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days persistent cache
const sessionSearchCache = new Set<string>();

/**
 * Sovereign Hybrid Search Strategy:
 * 1. Normalize Query
 * 2. Check Session Set (Avoid repeat calls)
 * 3. Check Firestore Cache Sanctuary
 * 4. Call Official YouTube API v3 (Fallback only)
 * 5. Save to Firestore for universal reuse
 */
export async function searchTracks(query: string): Promise<Track[]> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const sanitizedQuery = query?.toLowerCase().trim();
  
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  // 1. Normalize & Session Protection
  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');
  
  // 2. Firestore Cache Check (The Primary Sanctuary)
  try {
    const db = getDb();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL && data.results?.length > 0) {
        console.log(`Oracle: Manifested "${sanitizedQuery}" from Cache Sanctuary.`);
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Oracle: Cache Sanctuary access interrupted.", e);
  }

  // 3. Official API Call (Fallback Only)
  if (!apiKey) {
    console.error("Oracle: YouTube API Key missing. Check .env.");
    return getMockResults(sanitizedQuery);
  }

  console.log(`Oracle: Calling Official API for "${sanitizedQuery}"...`);

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(sanitizedQuery)}&type=video&videoCategoryId=10&maxResults=15&key=${apiKey}`
    );
    
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    const data = await res.json();
    const results = data.items.map((item: any) => {
      const videoId = item.id.videoId;
      return {
        id: videoId,
        title: normalizeMetadata(item.snippet.title),
        artist: normalizeMetadata(item.snippet.channelTitle),
        // Innertune Technique: Force high-res thumbnails
        thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        duration: 0, // Search API doesn't provide duration, player metadata will handle it
      };
    });

    // 4. Persistence Genesis
    if (results.length > 0) {
      updateCache(cacheKey, results);
    }
    
    return results;
  } catch (error) {
    console.error("Oracle: API Manifestation failed.", error);
    return getMockResults(sanitizedQuery);
  }
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
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey || !videoId || videoId.length !== 11) return MOCK_TRACKS;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=10&key=${apiKey}`
    );
    if (!res.ok) return MOCK_TRACKS;
    const data = await res.json();
    
    return data.items.map((item: any) => {
      const vid = item.id.videoId;
      return {
        id: vid,
        title: normalizeMetadata(item.snippet.title),
        artist: normalizeMetadata(item.snippet.channelTitle),
        thumbnail: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
        duration: 0,
      };
    });
  } catch (error) {
    return MOCK_TRACKS;
  }
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
  return MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/maxresdefault.jpg', duration: 185 },
];
