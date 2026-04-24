'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';

/**
 * Sovereign Saavn Search
 * Fetches real results from self-hosted JioSaavn API.
 */
export async function searchMusicAction(query: string): Promise<Track[]> {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } // Cache for 1 hour at edge
    });

    if (!response.ok) throw new Error("Saavn Vault unreachable.");

    const data = await response.json();
    
    // Extract songs from data.data.songs.results
    const songs = data.data?.songs?.results || [];

    const results: Track[] = songs.map((song: any) => ({
      id: song.id,
      title: song.title || song.name,
      artist: song.primaryArtists || 'Unknown Artist',
      // High quality image at index 2
      thumbnail: song.image?.[2]?.url || song.image?.[1]?.url || 'https://picsum.photos/seed/music/600/600',
      duration: parseInt(song.duration) || 0,
      isSaavn: true
    }));

    return results.slice(0, 15);
  } catch (error) {
    console.error("Saavn Scraper Error:", error);
    return [];
  }
}

/**
 * Sovereign Saavn Playback Fetcher
 * Extracts the 320kbps download link for a song ID.
 */
export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!response.ok) return null;

    const data = await response.json();
    // Saavn API detail returns an array of songs in data.data
    const songData = data.data?.[0];
    if (!songData) return null;

    // Prioritize 320kbps (index 4), fallback to 160kbps (index 3)
    const downloadUrl = songData.downloadUrl?.[4]?.link || songData.downloadUrl?.[3]?.link || songData.downloadUrl?.[2]?.link;
    
    return downloadUrl || null;
  } catch (error) {
    console.error("Saavn Playback Error:", error);
    return null;
  }
}
