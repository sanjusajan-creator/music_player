
import { useQuery } from "@tanstack/react-query";
import { searchTracks } from "@/lib/youtube";

export function useYouTubeSearch(query: string) {
  return useQuery({
    queryKey: ['music-search', query],
    queryFn: () => searchTracks(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1
  });
}
