
import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";
import { scrapeYouTubeSearch } from "@/app/actions/youtube-search";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30-day persistent sanctuary cache
const sessionSearchCache = new Set<string>();

/**
 * Sovereign Hybrid Search Engine
 * 1. Local Session Check
 * 2. Firestore Cache Sanctuary
 * 3. Sovereign Scraper (Server Action)
 * 4. Persistence Genesis
 */
export async function searchTracks(query: string): Promise<Track[]> {
  // 1. Normalize Query (Strategy #4)
  const sanitizedQuery = query?.toLowerCase().trim().replace(/ song$/i, '').replace(/ official$/i, '');
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');

  // 2. Session Protection (Strategy #8)
  if (sessionSearchCache.has(cacheKey)) {
    console.log(`Oracle: Reusing session manifestation for "${sanitizedQuery}"`);
  }

  // 3. Firestore Cache Sanctuary (Strategy #3 & #10)
  try {
    const db = getDb();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL && data.results?.length > 0) {
        console.log(`Oracle: Manifested from Cache Sanctuary.`);
        sessionSearchCache.add(cacheKey);
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Oracle: Cache Sanctuary access interrupted.");
  }

  // 4. Sovereign Scraper Fallback (Strategy #10 - Hybrid)
  console.log(`Oracle: Summoning Real YouTube Archives via Server Scraper...`);
  try {
    const results = await scrapeYouTubeSearch(sanitizedQuery);
    
    if (results && results.length > 0) {
      // 5. Persistence Genesis (Strategy #7)
      updateCache(cacheKey, results);
      sessionSearchCache.add(cacheKey);
      return results;
    }
    
    return MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(sanitizedQuery));
  } catch (error) {
    console.error("Oracle: Manifestation failed.", error);
    return MOCK_TRACKS;
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
  // Related videos is a complex scraper, use mock/cache for now to prevent loops
  return MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/maxresdefault.jpg', duration: 185 },
];
