
'use server';

import { Track } from '@/store/usePlayerStore';

const SAAVN_API_BASE = 'https://my-jiosaavn-api.onrender.com';

/**
 * Sovereign Saavn Multi-Search
 * Fetches all sections from the Saavn vault.
 */
export async function searchAllAction(query: string) {
  try {
    const response = await fetch(`${SAAVN_API_BASE}/api/search?query=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 } 
    });
    if (!response.ok) throw new Error("Saavn Vault unreachable.");
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Saavn Search Error:", error);
    return null;
  }
}

/**
 * Sovereign Song Manifestation
 * Fetches full metadata and stream URLs.
 */
export async function getSongDetailsAction(id: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/songs/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Sovereign Album/Playlist Details
 */
export async function getDetailAction(type: 'albums' | 'playlists' | 'artists', id: string) {
  try {
    const res = await fetch(`${SAAVN_API_BASE}/api/${type}/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    return null;
  }
}

/**
 * Sovereign Playback Fetcher
 */
export async function getSaavnPlaybackUrl(id: string): Promise<string | null> {
  try {
    const song = await getSongDetailsAction(id);
    if (!song || !song.downloadUrl) return null;
    const links = song.downloadUrl;
    // Use .url (NOT .link) from the highest quality index
    return links[links.length - 1]?.url || null;
  } catch (error) {
    return null;
  }
}
