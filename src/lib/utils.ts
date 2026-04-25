import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sovereign Image Manifestation Utility
 * Standardizes artwork extraction across Saavn, Gaana, and YouTube archives.
 */
export const getImage = (item: any) => {
  if (!item) return "https://picsum.photos/seed/music/400/400";
  
  const url = (
    item?.artworkUrl ||                         // Gaana (PRIMARY)
    item?.image?.[2]?.url ||                    // JioSaavn HD
    item?.image?.[0]?.url ||
    item?.thumbnail ||
    item?.thumbnailUrl ||
    `https://picsum.photos/seed/${item.id || 'default'}/400/400`
  );

  return url;
};
