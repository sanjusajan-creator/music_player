import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";
import { searchAllAction } from "@/app/actions/youtube-search";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30-day cache sanctuary
const sessionSearchCache = new Set<string>();

/**
 * Strategy #10: Hybrid Quota-Sovereign Search Engine (JioSaavn)
 * Exclusively uses Saavn API with robust Firestore caching.
 */
export async function searchTracks(query: string): Promise<Track[]> {
  // Strategy #4: Normalize Query
  const sanitizedQuery = query?.toLowerCase().trim();
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
        console.log(`Oracle: Manifested from Cache Sanctuary. API Units Saved.`);
        sessionSearchCache.add(cacheKey);
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Oracle: Cache Sanctuary access interrupted.");
  }

  console.log(`Oracle: Summoning Saavn Archives for "${sanitizedQuery}"...`);
  try {
    // Strategy #10: Call the Sovereign Server Action
    const result = await searchAllAction(sanitizedQuery);
    const results = result?.songs?.results || [];

    if (results.length > 0) {
      updateCache(cacheKey, results);
      sessionSearchCache.add(cacheKey);
    }
    
    return results;
  } catch (error) {
    console.error("Oracle: Saavn Manifestation failed.", error);
    return [];
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
  return [];
}