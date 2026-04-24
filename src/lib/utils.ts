import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sovereign Image Manifestation Utility
 * Standardizes artwork extraction across Saavn, Gaana, and YouTube vaults.
 */
export const getImage = (item: any) => {
  if (!item) return "https://picsum.photos/seed/music/600/600";
  
  // Standard extraction priority
  return (
    item.artworkUrl ||                         // Gaana Metadata
    item.image?.[2]?.url ||                    // JioSaavn High Fidelity
    item.image?.[1]?.url ||                    // JioSaavn Medium
    item.image?.[0]?.url ||                    // JioSaavn Low
    item.thumbnail?.url ||                     // YouTube Metadata
    item.thumbnail ||                          // Generic Fallback
    "https://picsum.photos/seed/music/600/600"
  );
};
