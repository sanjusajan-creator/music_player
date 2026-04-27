import { useQuery } from "@tanstack/react-query";
import { searchAllAction, getTrendingAction, getMusicHomeAction, getPlaylistAction, getArtistAction, getAlbumAction, getPlaylistSearchAction } from "@/app/actions/youtube-search";

const SEARCH_STALE_TIME = 1000 * 60 * 15;
const HOME_STALE_TIME = 1000 * 60 * 60;
const CACHE_LIFETIME = 1000 * 60 * 60 * 6;

const queryDefaults = {
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  gcTime: CACHE_LIFETIME,
};

export function useSaavnSearch(query: string) {
  return useQuery({
    queryKey: ['music-search', query],
    queryFn: () => searchAllAction(query),
    enabled: query.length >= 2,
    staleTime: SEARCH_STALE_TIME,
    placeholderData: (previousData) => previousData,
    ...queryDefaults,
  });
}

export function useTrending(region: string = 'IN') {
  return useQuery({
    queryKey: ['trending-music', region],
    queryFn: () => getTrendingAction(region),
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}

export function useMusicHome() {
  return useQuery({
    queryKey: ['music-home'],
    queryFn: () => getMusicHomeAction(),
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}

export function usePlaylistDetails(id: string) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylistAction(id),
    enabled: !!id,
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}

export function useArtistSearch(artistId: string) {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistAction(artistId),
    enabled: !!artistId,
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}

export function useAlbumSearch(albumId: string) {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbumAction(albumId),
    enabled: !!albumId,
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}

export function usePlaylistSearch(playlistId: string) {
  return useQuery({
    queryKey: ['playlist-search', playlistId],
    queryFn: () => getPlaylistSearchAction(playlistId),
    enabled: !!playlistId,
    staleTime: HOME_STALE_TIME,
    ...queryDefaults,
  });
}
