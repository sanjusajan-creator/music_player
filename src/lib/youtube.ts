import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Sovereign Multi-Provider Search Strategy (FULL SONGS):
 * 1. Audius API (Decentralized Full Tracks, Keyless)
 * 2. Archive.org (Public Domain / Community Full Audio, Keyless)
 * 3. Jamendo API (Open Music Full Audio, Keyless)
 * 4. YouTube (Fallback/Quota-aware Music Videos, Key required)
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

  // Tier 1: Audius Decentralized Grid (FULL TRACKS)
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
      console.log(`Oracle: Manifested ${results.length} tracks from Audius.`);
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // Tier 2: Internet Archive (Archive.org) (FULL TRACKS)
  try {
    console.log("Oracle: Summoning full tracks from Internet Archive...");
    const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl[]=identifier,title,creator,runtime&rows=10&output=json`;
    const res = await fetch(archiveUrl);
    const data = await res.json();
    if (data.response?.docs?.length > 0) {
      const results = data.response.docs.map((item: any) => ({
        id: `archive-${item.identifier}`,
        title: item.title || "Archive Recording",
        artist: item.creator || "Unknown Artist",
        thumbnail: `https://archive.org/services/img/${item.identifier}`,
        duration: item.runtime ? parseInt(item.runtime) * 60 : 180,
        previewUrl: `https://archive.org/download/${item.identifier}/${item.identifier}.mp3`
      }));
      console.log(`Oracle: Manifested ${results.length} tracks from Archive.org.`);
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // Tier 3: Jamendo Open Archive (FULL TRACKS)
  try {
    console.log("Oracle: Summoning full tracks from Jamendo...");
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
      console.log(`Oracle: Manifested ${results.length} tracks from Jamendo.`);
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {}

  // Final Tier: YouTube Vault (Fallback)
  if (YOUTUBE_API_KEY) {
    try {
      console.log("Oracle: Summoning from YouTube Vault (Fallback)...");
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
        console.log(`Oracle: Manifested ${results.length} tracks from YouTube.`);
        updateCache(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.warn("Oracle: YouTube Vault access denied (Quota). Falling back to Cosmic Cache.");
    }
  }

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
  // STRICT SHIELD: Intercept non-YouTube IDs to prevent 403 Forbidden quota errors
  if (!videoId || videoId.length !== 11 || videoId.includes('-')) {
    console.log("Oracle: Shielding related-videos request for non-YouTube ID.");
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
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function getMockResults(query: string): Track[] {
  const filtered = MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
  return filtered.length > 0 ? filtered : MOCK_TRACKS;
}

const MOCK_TRACKS: Track[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://picsum.photos/seed/rick/600/600', duration: 212 },
  { id: 'L_jWHffIx5E', title: 'Smells Like Teen Spirit', artist: 'Nirvana', thumbnail: 'https://picsum.photos/seed/nirvana/600/600', duration: 301 },
  { id: 'hTWKbfoikeg', title: 'Midnight Gold', artist: 'Lux Record', thumbnail: 'https://picsum.photos/seed/gold/600/600', duration: 185 },
  { id: 'itunes-1', title: 'Cosmic Sanctuary', artist: 'The Oracle', thumbnail: 'https://picsum.photos/seed/cosmic/600/600', duration: 300, previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
];
