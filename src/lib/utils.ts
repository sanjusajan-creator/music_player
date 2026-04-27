import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sovereign Image Manifestation Utility
 * Standardizes artwork extraction across Saavn, Gaana, and YouTube archives.
 */
export const getImage = (item: any): string => {
  if (!item) return "https://picsum.photos/seed/music/400/400";

  let url = "";

  // 1. Gaana primary
  if (item.artworkUrl) url = item.artworkUrl;

  // 2. JioSaavn (image array)
  if (!url && Array.isArray(item.image)) {
    url = item.image[2]?.url || item.image[1]?.url || item.image[0]?.url || "";
  }

  // 3. YouTube — thumbnail can be a plain URL string or nested object
  if (!url && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
    url = item.thumbnail;
  }
  if (!url && item.thumbnail?.url) url = item.thumbnail.url;
  if (!url && Array.isArray(item.thumbnail?.thumbnails)) {
    url = item.thumbnail.thumbnails.slice(-1)[0]?.url || "";
  }
  if (!url && item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails) {
    url = item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails.slice(-1)[0]?.url || "";
  }

  // 4. Generic fallbacks
  if (!url && item.thumbnailUrl) url = item.thumbnailUrl;

  // 5. YT video ID → use i.ytimg.com directly (always works, no proxy)
  if (!url) {
    const vid = item.videoId || item.id;
    if (vid && !vid.startsWith('UC') && !vid.startsWith('MPR') && !vid.startsWith('RD') && !vid.startsWith('PL') && !vid.startsWith('OL')) {
      url = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    }
  }

  if (!url) {
    url = `https://picsum.photos/seed/${item.id || 'default'}/400/400`;
  }

  // High Quality Enhancements
  if (url.includes('saavncdn.com') || url.includes('jiosaavn.com')) {
    // JioSaavn images are usually already 500x500 if available, but if it's 150x150 we can try 500x500.
    url = url.replace('150x150.jpg', '500x500.jpg').replace('50x50.jpg', '500x500.jpg');
  } else if (url.includes('lh3.googleusercontent.com') || url.includes('yt3.ggpht.com')) {
    url = url.replace(/=w\d+-h\d+/g, '=w544-h544').replace(/=s\d+-/g, '=s544-');
  } else if (url.includes('i.ytimg.com/vi/')) {
    url = url.replace('/mqdefault.jpg', '/hqdefault.jpg').replace('/default.jpg', '/hqdefault.jpg');
  }

  return url;
};

