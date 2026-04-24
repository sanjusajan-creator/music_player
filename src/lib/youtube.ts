import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Sovereign Search Strategy (Innertune-inspired):
 * 1. Direct YouTube Scraping via Piped Proxy (Accurate, Real results, No Key)
 * 2. Audius Grid (High-Fidelity Full Tracks fallback)
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

  // Tier 1: Real YouTube Results via Piped (Free, High-Fidelity, Accurate)
  try {
    console.log("Oracle: Summoning Real YouTube Archives...");
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
          const results = data.items.slice(0, 15).map((item: any) => {
            const videoId = item.url.split('v=')[1];
            return {
              id: videoId,
              title: normalizeMetadata(item.title),
              artist: normalizeMetadata(item.uploaderName),
              // Innertune Technique: Force maxres for premium visuals
              thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
              duration: item.duration || 0,
            };
          });
          
          updateCache(cacheKey, results);
          console.log(`Oracle: Manifested ${results.length} real YouTube tracks.`);
          return results;
        }
      } catch (e) { continue; }
    }
  } catch (e) {}

  // Tier 2: Audius Grid (Fallback)
  try {
    console.log("Oracle: YouTube Proxy restricted. Summoning from Audius...");
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
  // SOVEREIGN SHIELD: Don't call YT API for non-YT IDs
  if (!videoId || videoId.length !== 11 || videoId.includes('-')) {
    return MOCK_TRACKS;
  }
  
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
    if (!res.ok) return MOCK_TRACKS;
    const data = await res.json();
    
    return (data.relatedItems || []).slice(0, 10).map((item: any) => {
      const vid = item.url.split('v=')[1];
      return {
        id: vid,
        title: normalizeMetadata(item.title),
        artist: normalizeMetadata(item.uploaderName),
        thumbnail: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
        duration: item.duration || 0,
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
  const filtered = MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
  return filtered.length > 0 ? filtered : MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/maxresdefault.jpg', duration: 185 },
];
