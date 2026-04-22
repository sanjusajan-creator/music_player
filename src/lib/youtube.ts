
import { Track } from "@/store/usePlayerStore";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours for better optimization

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query || query.trim() === "") return [];

  const cacheKey = query.toLowerCase().trim();
  
  // 1. Try Firestore Cache (Persistent across devices)
  try {
    const db = getFirestore();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);

    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL) {
        console.log("Serving from Firestore cache:", cacheKey);
        return data.results;
      }
    }
  } catch (e) {
    console.warn("Firestore cache fetch failed", e);
  }

  // Fallback to Mocks if no key
  if (!YOUTUBE_API_KEY) {
    return MOCK_TRACKS.filter(t => 
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      t.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  try {
    // 2. Search for IDs (cost 100) - Strict filtering
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=12&key=${YOUTUBE_API_KEY}&regionCode=US&relevanceLanguage=en`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.error) throw new Error(searchData.error.message);
    
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    if (!videoIds) return [];

    // 3. Get detailed info using videos.list (cost 1)
    const listUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    const tracks: Track[] = listData.items
      .map((item: any) => ({
        id: item.id,
        title: normalizeMetadata(item.snippet.title),
        artist: normalizeMetadata(item.snippet.channelTitle),
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        duration: parseISO8601Duration(item.contentDetails.duration),
      }))
      .filter((t: Track) => t.title.trim() !== "" && t.artist.trim() !== "");

    // 4. Cache results in Firestore
    try {
      const db = getFirestore();
      const cacheRef = doc(db, "search_cache", cacheKey);
      setDoc(cacheRef, {
        results: tracks,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore cache save failed", e);
    }

    return tracks;
  } catch (error) {
    console.error("YouTube search failed:", error);
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
    .trim();
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://picsum.photos/seed/rick/600/600', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://picsum.photos/seed/nirvana/600/600', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://picsum.photos/seed/gold/600/600', duration: 185 }
];
