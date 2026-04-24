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
      next: { revalidate: 3600 } 
    });

    if (!response.ok) throw new Error("Saavn Vault unreachable.");

    const data = await response.json();
    const songs = data.data?.songs?.results || [];

    const results: Track[] = songs.map((song: any) => ({
      id: song.id,
      title: song.title?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || song.name,
      artist: song.primaryArtists?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || 'Unknown Artist',
      thumbnail: song.image?.[2]?.url || song.image?.[1]?.url || 'https://picsum.photos/seed/music/600/600',
      duration: parseInt(song.duration) || 0,
      isSaavn: true
    }));

    return results.slice(0, 15);
  } catch (error) {
    console.error("Saavn Search Error:", error);
    return [];
  }
}

/**
 * Sovereign Saavn Playback Fetcher
 * Dynamic high-quality stream extraction from the Saavn Vault.
 */
export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!response.ok) return null;

    const data = await response.json();
    const songData = data.data?.[0];
    if (!songData) return null;

    const links = songData.downloadUrl;
    if (!Array.isArray(links) || links.length === 0) return null;

    // High Fidelity Strategy: Find the highest quality link available (usually 320kbps at the end)
    const bestLink = links[links.length - 1]?.link || links[0]?.link;
    
    return bestLink || null;
  } catch (error) {
    console.error("Saavn Playback Error:", error);
    return null;
  }
}
