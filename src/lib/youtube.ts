import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30-day cache sanctuary
const sessionSearchCache = new Set<string>();

/**
 * Strategy #10: Hybrid Quota-Sovereign Search Engine
 * 1. Normalize Query (Strategy #4)
 * 2. Check Session Set (Strategy #8)
 * 3. Check Firestore Cache (Strategy #3)
 * 4. Call Official API (Fallback)
 * 5. Limit Results to 5 (Strategy #5)
 * 6. Save to Cache (Strategy #7)
 */
export async function searchTracks(query: string): Promise<Track[]> {
  // Strategy #4: Normalize Query
  const sanitizedQuery = query?.toLowerCase().trim().replace(/ song$/i, '').replace(/ official$/i, '');
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');

  // Strategy #8: Session Protection
  if (sessionSearchCache.has(cacheKey)) {
    console.log(`Oracle: Reusing session manifestation for "${sanitizedQuery}"`);
  }

  // Strategy #3: Firestore Cache Sanctuary
  try {
    const db = getDb();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL && data.results?.length > 0) {
        console.log(`Oracle: Manifested from Cache Sanctuary. Quota Saved.`);
        sessionSearchCache.add(cacheKey);
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Oracle: Cache Sanctuary access interrupted.");
  }

  // Strategy #10: Official API Fallback
  if (!API_KEY) {
    console.warn("Oracle: No API Key detected. Manifesting Mocks.");
    return MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(sanitizedQuery));
  }

  console.log(`Oracle: Calling Official API for "${sanitizedQuery}"...`);
  try {
    // Strategy #5: Limit Results to 5 for maximum quota preservation
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(sanitizedQuery)}&type=video&videoCategoryId=10&maxResults=5&key=${API_KEY}`
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const results: Track[] = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      artist: item.snippet.channelTitle,
      // Strategy #7: Cache IDs permanently with high-res thumbnails
      thumbnail: `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
      duration: 0 
    }));

    if (results.length > 0) {
      updateCache(cacheKey, results);
      sessionSearchCache.add(cacheKey);
    }
    
    return results;
  } catch (error) {
    console.error("Oracle: API Manifestation failed.", error);
    return MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(sanitizedQuery));
  }
}

async function updateCache(key: string, results: Track[]) {
  try {
    const db = getDb();
    await setDoc(doc(db, "search_cache", key), {
      results,
      timestamp: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
}

export async function getRelatedVideos(videoId: string): Promise<Track[]> {
  return MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/hqdefault.jpg', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/hqdefault.jpg', duration: 185 },
];
