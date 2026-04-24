import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Multi-Provider Search Strategy (Sovereignty Architecture):
 * 1. iTunes API (Public, No Key needed)
 * 2. Audius API (Public, Decentralized, No Key needed)
 * 3. Deezer API (Via Proxy, No Key needed)
 * 4. YouTube (Fallback/Quota-aware)
 * 5. Cosmic Archive (Mock fallback)
 */
export async function searchTracks(query: string): Promise<Track[]> {
  const sanitizedQuery = query?.toLowerCase().trim();
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');
  
  // 1. Check Firestore Cache first for performance
  try {
    const db = getDb();
    const cacheRef = doc(db, "search_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);

    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const age = Date.now() - (data.timestamp?.toMillis() || 0);
      if (age < CACHE_TTL) return data.results;
    }
  } catch (e) {}

  // 2. Try iTunes Search API
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`;
    const itunesRes = await fetch(itunesUrl);
    const itunesData = await itunesRes.json();
    if (itunesData.results && itunesData.results.length > 0) {
      const results = itunesData.results.map((item: any) => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        thumbnail: item.artworkUrl100.replace('100x100', '600x600'),
        duration: Math.floor(item.trackTimeMillis / 1000)
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // 3. Try Audius API (Decentralized, No Key)
  try {
    const audiusRes = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=VIBECRAFT`);
    const audiusData = await audiusRes.json();
    if (audiusData.data && audiusData.data.length > 0) {
      const results = audiusData.data.map((item: any) => ({
        id: `audius-${item.id}`,
        title: item.title,
        artist: item.user.name,
        thumbnail: item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || 'https://picsum.photos/seed/audius/400/400',
        duration: Math.floor(item.duration)
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // 4. Try Deezer Search API (Via allorigins proxy)
  try {
    const deezerUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.deezer.com/search?q=${query}&limit=15`)}`;
    const deezerRes = await fetch(deezerUrl);
    const deezerData = await deezerRes.json();
    const contents = JSON.parse(deezerData.contents);
    if (contents.data && contents.data.length > 0) {
      const results = contents.data.map((item: any) => ({
        id: `deezer-${item.id}`,
        title: item.title,
        artist: item.artist.name,
        thumbnail: item.album.cover_xl || item.album.cover_big,
        duration: item.duration
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // 5. YouTube API (Quota-aware fallback)
  if (YOUTUBE_API_KEY) {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&maxResults=15&key=${YOUTUBE_API_KEY}`;
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
          thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
          duration: parseISO8601Duration(item.contentDetails.duration),
        }));
        updateCache(cacheKey, results);
        return results;
      }
    } catch (error) {}
  }

  // 6. Final Fallback: Cosmic Archive
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
  if (!videoId || videoId.startsWith('local-')) return [];
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
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
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
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\(Official Video\)/gi, '')
    .replace(/\[Official Video\]/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .trim();
}

function getMockResults(query: string): Track[] {
  const filtered = MOCK_TRACKS.filter(t => 
    t.title.toLowerCase().includes(query) || 
    t.artist.toLowerCase().includes(query)
  );
  return filtered.length > 0 ? filtered : MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://picsum.photos/seed/rick/600/600', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://picsum.photos/seed/nirvana/600/600', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://picsum.photos/seed/gold/600/600', duration: 185 },
  { id: 'YQHsXMglC9A', title: 'Hello', artist: 'Adele', thumbnail: 'https://picsum.photos/seed/adele/600/600', duration: 367 },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://picsum.photos/seed/ed/600/600', duration: 233 },
  { id: '9bZkp7q19f0', title: 'Gangnam Style', artist: 'PSY', thumbnail: 'https://picsum.photos/seed/psy/600/600', duration: 252 },
  { id: 'fRh_vgS2dFE', title: 'Sorry', artist: 'Justin Bieber', thumbnail: 'https://picsum.photos/seed/bieber/600/600', duration: 200 },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', thumbnail: 'https://picsum.photos/seed/fonsi/600/600', duration: 228 },
  { id: '7wtfhZwyrAY', title: 'Uptown Funk', artist: 'Mark Ronson', thumbnail: 'https://picsum.photos/seed/bruno/600/600', duration: 270 },
  { id: 'OPf0YbXqDm0', title: 'Mark My Words', artist: 'Bieber', thumbnail: 'https://picsum.photos/seed/words/600/600', duration: 134 }
];