import { Track } from "@/store/usePlayerStore";

// Note: In a production app, the API Key should be handled via server-side env vars.
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';

// Mock data for when API key is missing
const MOCK_TRACKS: Track[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    thumbnail: 'https://picsum.photos/seed/rick/400/400',
    duration: 212
  },
  {
    id: 'L_jWHffIx5E',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    thumbnail: 'https://picsum.photos/seed/nirvana/400/400',
    duration: 301
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi',
    thumbnail: 'https://picsum.photos/seed/despacito/400/400',
    duration: 287
  },
  {
    id: '9bZkp7q19f0',
    title: 'Gangnam Style',
    artist: 'PSY',
    thumbnail: 'https://picsum.photos/seed/psy/400/400',
    duration: 252
  },
  {
    id: 'YQHsXMglC9A',
    title: 'Hello',
    artist: 'Adele',
    thumbnail: 'https://picsum.photos/seed/adele/400/400',
    duration: 367
  }
];

export async function searchTracks(query: string): Promise<Track[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn("YouTube API Key is missing. Returning mock results for testing.");
    // Filter mock tracks by query to simulate real search
    return MOCK_TRACKS.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) || 
      track.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("YouTube API Error:", data.error);
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: normalizeMetadata(item.snippet.title),
      artist: normalizeMetadata(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
    }));
  } catch (error) {
    console.error("Failed to fetch YouTube data:", error);
    return [];
  }
}

function normalizeMetadata(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\(Official Video\)/gi, '')
    .replace(/\[Official Video\]/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .replace(/\(Music Video\)/gi, '')
    .replace(/\[Music Video\]/gi, '')
    .replace(/\(Video\)/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .trim();
}

export function getTrackDuration(id: string): Promise<number> {
  if (!YOUTUBE_API_KEY) return Promise.resolve(0);
  
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${YOUTUBE_API_KEY}`;
  
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const duration = data.items?.[0]?.contentDetails?.duration;
      if (!duration) return 0;
      
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');
      return (hours * 3600) + (minutes * 60) + seconds;
    })
    .catch(() => 0);
}
