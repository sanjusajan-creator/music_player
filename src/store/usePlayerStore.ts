import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getRelatedTracksAction } from '@/app/actions/youtube-search';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  album?: string;
  duration?: string | number;
  type?: 'song' | 'video' | 'album' | 'playlist' | 'artist';
  isLocal?: boolean;
  localFile?: File;
  isSaavn?: boolean;
  isYouTube?: boolean;
  isGaana?: boolean;
  videoId?: string;
  streamUrl?: string;
  url?: string;
  hasLyrics?: boolean;
  source?: 'jiosaavn' | 'gaana' | 'youtube' | 'local';
}

export type AudioQuality = 'low' | 'medium' | 'high' | 'auto';
export type StreamingMode = 'stream' | 'download' | 'offline';
export type RepeatMode = 'none' | 'one' | 'all';
export type LayoutMode = 'grid' | 'list';

interface SettingsState {
  audioQuality: AudioQuality;
  streamingMode: StreamingMode;
  showLyrics: boolean;
  autoScrollLyrics: boolean;
  autoplaySimilar: boolean;
  dataSaver: boolean;
  layoutMode: LayoutMode;
  isVideoVisible: boolean;
  useIframeForYouTube: boolean;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[]; 
  history: Track[];
  localTracks: Track[];
  likedTrackIds: string[]; 
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;
  progress: number;
  duration: number;
  seekRequest: number | null;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  hasHydrated: boolean;
  settings: SettingsState;
  sleepTimer: number | null; 
  
  setHasHydrated: (state: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  playNextFromQueue: (track: Track) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  removeFromQueue: (trackId: string) => void;
  setLocalTracks: (tracks: Track[]) => void;
  setLikedTracks: (ids: string[]) => void;
  toggleLike: (trackId: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (time: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  clearQueue: () => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  toggleVideo: () => void;
  setSleepTimer: (minutes: number | null) => void;
  tickSleepTimer: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      originalQueue: [],
      history: [],
      localTracks: [],
      likedTrackIds: [],
      isPlaying: false,
      isBuffering: false,
      volume: 80,
      progress: 0,
      duration: 0,
      seekRequest: null,
      repeatMode: 'none',
      isShuffle: false,
      hasHydrated: false,
      sleepTimer: null,
      settings: {
        audioQuality: 'auto',
        streamingMode: 'stream',
        showLyrics: true,
        autoScrollLyrics: true,
        autoplaySimilar: true,
        dataSaver: false,
        layoutMode: 'list',
        isVideoVisible: false,
        useIframeForYouTube: true,
      },

      setHasHydrated: (state) => set({ hasHydrated: state }),

      setCurrentTrack: (track) => {
        const { currentTrack, history } = get();
        if (currentTrack && currentTrack.id !== track?.id) {
          const newHistory = [currentTrack, ...history.filter(t => t.id !== currentTrack.id)].slice(0, 50);
          set({ history: newHistory });
        }
        set({ currentTrack: track, progress: 0, isPlaying: true, seekRequest: 0 });
      },

      playNextFromQueue: (track) => set((state) => ({ queue: [track, ...state.queue] })),

      addToQueue: (track) => set((state) => ({ 
        queue: [...state.queue, track],
        originalQueue: [...state.originalQueue, track]
      })),

      setQueue: (tracks, startIndex = 0) => {
        const selected = tracks[startIndex];
        if (!selected) return;

        const { currentTrack, history } = get();
        const nextHistory = currentTrack ? [currentTrack, ...history].slice(0, 50) : history;

        set({ 
          currentTrack: selected,
          queue: tracks.slice(startIndex + 1), 
          originalQueue: tracks,
          history: nextHistory,
          isPlaying: true,
          progress: 0,
          seekRequest: 0
        });
      },

      setLocalTracks: (tracks) => set({ localTracks: tracks }),

      removeFromQueue: (trackId) => set((state) => ({ 
        queue: state.queue.filter((t) => t.id !== trackId),
        originalQueue: state.originalQueue.filter((t) => t.id !== trackId)
      })),
      
      clearQueue: () => set({ queue: [], originalQueue: [] }),

      setLikedTracks: (ids) => set({ likedTrackIds: Array.isArray(ids) ? ids : [] }),
      
      toggleLike: (trackId) => set((state) => {
        const currentLiked = Array.isArray(state.likedTrackIds) ? state.likedTrackIds : [];
        const next = currentLiked.includes(trackId)
          ? currentLiked.filter(id => id !== trackId)
          : [...currentLiked, trackId];
        return { likedTrackIds: next };
      }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsBuffering: (isBuffering) => set({ isBuffering }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      seekTo: (time) => set({ seekRequest: time, progress: time }),

      toggleShuffle: () => set((state) => {
        const isShuffle = !state.isShuffle;
        if (isShuffle) {
          const shuffled = [...state.queue].sort(() => Math.random() - 0.5);
          return { isShuffle, queue: shuffled };
        } else {
          return { isShuffle, queue: state.originalQueue.filter(t => t.id !== state.currentTrack?.id) };
        }
      }),

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      nextTrack: async () => {
        const { queue, repeatMode, currentTrack, originalQueue, history, settings } = get();
        
        if (repeatMode === 'one' && currentTrack) {
          set({ progress: 0, seekRequest: 0, isPlaying: true });
          return;
        }
        
        const nextHistory = currentTrack ? [currentTrack, ...history].slice(0, 50) : history;

        if (queue.length > 0) {
          set({ 
            currentTrack: queue[0], 
            queue: queue.slice(1), 
            history: nextHistory,
            progress: 0, 
            seekRequest: 0, 
            isPlaying: true 
          });
        } else if (repeatMode === 'all' && originalQueue.length > 0) {
          set({ 
            currentTrack: originalQueue[0], 
            queue: originalQueue.slice(1), 
            history: nextHistory,
            progress: 0, 
            seekRequest: 0, 
            isPlaying: true 
          });
        } else if (settings.autoplaySimilar && currentTrack && currentTrack.isYouTube) {
          // Autoplay Sanctuary: Fetch similar tracks from the next API
          const related = await getRelatedTracksAction(currentTrack.videoId || currentTrack.id);
          if (related.length > 0) {
            set({
              currentTrack: related[0],
              queue: related.slice(1),
              history: nextHistory,
              progress: 0,
              seekRequest: 0,
              isPlaying: true
            });
          } else {
            set({ isPlaying: false, progress: 0 });
          }
        } else {
          set({ isPlaying: false, progress: 0 });
        }
      },

      previousTrack: () => {
        const { history, currentTrack, queue } = get();
        if (history.length > 0) {
          const prev = history[0];
          set({ 
            currentTrack: prev, 
            history: history.slice(1), 
            queue: currentTrack ? [currentTrack, ...queue] : queue, 
            progress: 0, 
            seekRequest: 0,
            isPlaying: true
          });
        }
      },

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      toggleVideo: () => set((state) => ({
        settings: { ...state.settings, isVideoVisible: !state.settings.isVideoVisible }
      })),

      setSleepTimer: (minutes) => set({ sleepTimer: minutes ? minutes * 60 : null }),
      tickSleepTimer: () => {
        const { sleepTimer } = get();
        if (sleepTimer === null) return;
        if (sleepTimer <= 0) {
          set({ sleepTimer: null, isPlaying: false });
          return;
        }
        set({ sleepTimer: sleepTimer - 1 });
      }
    }),
    {
      name: 'vibecraft-sovereign-v10',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        volume: state.volume, 
        history: state.history,
        likedTrackIds: state.likedTrackIds,
        repeatMode: state.repeatMode,
        isShuffle: state.isShuffle,
        queue: state.queue,
        settings: state.settings
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        if (rehydratedState) {
          rehydratedState.hasHydrated = true;
          if (!Array.isArray(rehydratedState.likedTrackIds)) rehydratedState.likedTrackIds = [];
          rehydratedState.settings.isVideoVisible = false;
        }
      }
    }
  )
);
