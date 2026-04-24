import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sovereign Image Manifestation Utility
 * Standardizes artwork extraction across Saavn, Gaana, and YouTube vaults.
 * Optimized for Gaana artworkUrl priority.
 */
export const getImage = (item: any) => {
  if (!item) return "https://via.placeholder.com/150";
  
  return (
    item?.artworkUrl ||                         // Gaana (PRIMARY)
    item?.image?.[2]?.url ||                    // JioSaavn HD
    item?.image?.[0]?.url ||
    item?.thumbnail ||
    "https://via.placeholder.com/150"
  );
};
