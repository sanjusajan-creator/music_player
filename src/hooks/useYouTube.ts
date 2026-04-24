
import { useQuery } from "@tanstack/react-query";
import { searchAllAction, getDetailAction } from "@/app/actions/youtube-search";

export function useSaavnSearch(query: string) {
  return useQuery({
    queryKey: ['saavn-search', query],
    queryFn: () => searchAllAction(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1
  });
}

export function useSaavnDetails(type: 'albums' | 'playlists' | 'artists', id: string) {
  return useQuery({
    queryKey: ['saavn-details', type, id],
    queryFn: () => getDetailAction(type, id),
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
