import { Track } from "@/store/usePlayerStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/firebase";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours persistent cache

/**
 * Sovereign Multi-Provider Search Strategy with Detailed Logging:
 * 1. iTunes API (Public)
 * 2. Audius API (Decentralized Public)
 * 3. Deezer API (Via Proxy)
 * 4. Mixcloud API (Public)
 * 5. Archive.org (Public)
 * 6. YouTube (Fallback/Quota-aware)
 * 7. Cosmic Archive (Mock fallback)
 */
export async function searchTracks(query: string): Promise<Track[]> {
  const sanitizedQuery = query?.toLowerCase().trim();
  if (!sanitizedQuery || sanitizedQuery.length < 2) return [];

  const cacheKey = sanitizedQuery.replace(/\s+/g, '_');
  
  // 1. Check Firestore Cache first
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

  // tier 1: iTunes Search API
  try {
    console.log("Oracle: Summoning from iTunes Archive...");
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`;
    const res = await fetch(itunesUrl);
    const data = await res.json();
    if (data.results?.length > 0) {
      console.log(`Oracle: Manifested ${data.resultCount} tracks from iTunes.`);
      const results = data.results.map((item: any) => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        thumbnail: item.artworkUrl100.replace('100x100', '600x600'),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl // Critical for playback when YT is dead
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn("Oracle: iTunes Archive silent.");
  }

  // tier 2: Audius API (Decentralized)
  try {
    console.log("Oracle: Summoning from Audius Decentralized Grid...");
    const res = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=VIBECRAFT`);
    const data = await res.json();
    if (data.data?.length > 0) {
      console.log(`Oracle: Manifested ${data.data.length} tracks from Audius.`);
      const results = data.data.map((item: any) => ({
        id: `audius-${item.id}`,
        title: item.title,
        artist: item.user.name,
        thumbnail: item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || 'https://picsum.photos/seed/audius/400/400',
        duration: Math.floor(item.duration),
        previewUrl: `https://creatornode.audius.co/v1/tracks/${item.id}/stream?app_name=VIBECRAFT`
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn("Oracle: Audius Grid silent.");
  }

  // tier 3: Deezer API
  try {
    console.log("Oracle: Summoning from Deezer Sanctuary...");
    const deezerUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.deezer.com/search?q=${query}&limit=15`)}`;
    const res = await fetch(deezerUrl);
    const data = await res.json();
    const contents = JSON.parse(data.contents);
    if (contents.data?.length > 0) {
      console.log(`Oracle: Manifested ${contents.data.length} tracks from Deezer.`);
      const results = contents.data.map((item: any) => ({
        id: `deezer-${item.id}`,
        title: item.title,
        artist: item.artist.name,
        thumbnail: item.album.cover_xl || item.album.cover_big,
        duration: item.duration,
        previewUrl: item.preview
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn("Oracle: Deezer Sanctuary silent.");
  }

  // tier 4: Mixcloud API
  try {
    console.log("Oracle: Summoning from Mixcloud Vault...");
    const res = await fetch(`https://api.mixcloud.com/search/?q=${encodeURIComponent(query)}&type=cloudcast`);
    const data = await res.json();
    if (data.data?.length > 0) {
      console.log(`Oracle: Manifested ${data.data.length} tracks from Mixcloud.`);
      const results = data.data.map((item: any) => ({
        id: `mixcloud-${item.key.replace(/\//g, '-')}`,
        title: item.name,
        artist: item.user.username,
        thumbnail: item.pictures.extra_large || item.pictures.large || 'https://picsum.photos/seed/mixcloud/400/400',
        duration: item.audio_length,
        // Mixcloud doesn't provide easy direct streams without keys, so we keep metadata
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn("Oracle: Mixcloud Vault silent.");
  }

  // tier 5: Archive.org API
  try {
    console.log("Oracle: Summoning from The Internet Archive...");
    const res = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&output=json&rows=15`);
    const data = await res.json();
    if (data.response.docs?.length > 0) {
      console.log(`Oracle: Manifested ${data.response.docs.length} tracks from Archive.org.`);
      const results = data.response.docs.map((item: any) => ({
        id: `archive-${item.identifier}`,
        title: item.title || "Unknown Archive",
        artist: item.creator?.[0] || item.creator || "Unknown Artist",
        thumbnail: `https://archive.org/services/img/${item.identifier}`,
        duration: 0,
        previewUrl: `https://archive.org/download/${item.identifier}` // Attempt generic download
      }));
      updateCache(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn("Oracle: Internet Archive silent.");
  }

  // Final tier: YouTube (Quota-aware)
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
      console.error("Oracle: YouTube Vault Quota Exceeded or Error.");
    }
  }

  // Final Fallback: Cosmic Archive
  console.log("Oracle: Cosmic Archive Manifested (Final Fallback).");
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
  // If not a standard YouTube ID (11 chars, no prefix), return mock results to avoid 403s
  if (!videoId || videoId.length !== 11 || videoId.includes('-')) {
    console.log("Oracle: Public Archive track detected. Summoning related mocks.");
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
