'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';

/**
 * Sovereign Saavn Search
 * Fetches real results from the Saavn API vault.
 */
export async function searchMusicAction(query: string): Promise<Track[]> {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } 
    });

    if (!response.ok) throw new Error("Saavn Vault unreachable.");

    const data = await response.json();
    // Requirement: ONLY use data.data.songs.results
    const songs = data.data?.songs?.results || [];

    const results: Track[] = songs.map((song: any) => ({
      id: song.id,
      title: song.title?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || song.name,
      artist: song.primaryArtists?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || 'Unknown Artist',
      thumbnail: song.image?.[2]?.url || song.image?.[1]?.url || 'https://picsum.photos/seed/music/600/600',
      duration: parseInt(song.duration) || 0,
      isSaavn: true
    }));

    return results;
  } catch (error) {
    console.error("Saavn Search Error:", error);
    return [];
  }
}

/**
 * Sovereign Saavn Playback Fetcher
 * Extracts the highest quality URL from the downloadUrl vault.
 */
export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!response.ok) return null;

    const data = await response.json();
    const songData = data.data?.[0];
    if (!songData || !songData.downloadUrl) return null;

    // Requirement: Use .url (NOT .link) from the highest quality index
    const links = songData.downloadUrl;
    const bestUrl = links[links.length - 1]?.url;
    
    return bestUrl || null;
  } catch (error) {
    console.error("Saavn Playback Error:", error);
    return null;
  }
}
