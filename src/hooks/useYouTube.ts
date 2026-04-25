import { useQuery } from "@tanstack/react-query";
import { searchAllAction, getTrendingAction, getMusicHomeAction, getPlaylistAction } from "@/app/actions/youtube-search";

export function useSaavnSearch(query: string) {
  return useQuery({
    queryKey: ['music-search', query],
    queryFn: () => searchAllAction(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 15,
  });
}

export function useTrending(region: string = 'IN') {
  return useQuery({
    queryKey: ['trending-music', region],
    queryFn: () => getTrendingAction(region),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMusicHome() {
  return useQuery({
    queryKey: ['music-home'],
    queryFn: () => getMusicHomeAction(),
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlaylistDetails(id: string) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylistAction(id),
    enabled: !!id,
  });
}
