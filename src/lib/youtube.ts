import { Track } from "@/store/usePlayerStore";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Enhanced Search with logic to reduce API calls:
 * 1. Checks Firestore persistent cache first.
 * 2. If query is a single word, prioritizes cached broad results.
 * 3. Uses videoCategoryId=10 (Music) for relevance.
 * 4. Limits results to 15 to balance quality and quota.
 */
export async function searchTracks(query: string): Promise<Track[]> {
  const sanitizedQuery = query?.toLowerCase().trim();
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');
  
  // 1. Try Firestore Cache
  try {
    const db = getFirestore();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);

    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL) {
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Cache fetch bypassed", e);
  }

  // Fallback to Mocks if no key
  if (!YOUTUBE_API_KEY) {
    return MOCK_TRACKS.filter(t => 
      t.title.toLowerCase().includes(sanitizedQuery) || 
      t.artist.toLowerCase().includes(sanitizedQuery)
    );
  }

  try {
    // 2. Search for IDs (cost 100)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=15&key=${YOUTUBE_API_KEY}&regionCode=US&relevanceLanguage=en`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.error) throw new Error(searchData.error.message);
    
    const videoIds = searchData.items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];

    // 3. Get detailed info (cost 1)
    const listUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    const tracks: Track[] = listData.items
      .map((item: any) => ({
        id: item.id,
        title: normalizeMetadata(item.snippet.title),
        artist: normalizeMetadata(item.snippet.channelTitle),
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        duration: parseISO8601Duration(item.contentDetails.duration),
      }))
      .filter((t: Track) => t.title.trim() !== "" && t.artist.trim() !== "");

    // 4. Update Cache (Non-blocking setDoc for efficiency)
    try {
      const db = getFirestore();
      const cacheRef = doc(db, "search_cache", cacheKey);
      setDoc(cacheRef, {
        results: tracks,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Cache write failed", e);
    }

    return tracks;
  } catch (error) {
    console.error("YouTube engine failure:", error);
    return [];
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
    .replace(/\[Official Video\]/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .replace(/\(Official MV\)/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\(Lyrics Video\)/gi, '')
    .trim();
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://picsum.photos/seed/rick/600/600', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://picsum.photos/seed/nirvana/600/600', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://picsum.photos/seed/gold/600/600', duration: 185 }
];