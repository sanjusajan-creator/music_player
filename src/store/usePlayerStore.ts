import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  isLocal?: boolean;
  localFile?: File;
  previewUrl?: string; 
  isSaavn?: boolean;
}

type RepeatMode = 'none' | 'one' | 'all';

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
  
  setHasHydrated: (state: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  playNextFromQueue: (track: Track) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
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

      setHasHydrated: (state) => set({ hasHydrated: state }),

      setCurrentTrack: (track) => {
        const { currentTrack, history } = get();
        if (currentTrack && currentTrack.id !== track?.id) {
          const newHistory = [currentTrack, ...history.filter(t => t.id !== currentTrack.id)].slice(0, 50);
          set({ history: newHistory });
        }
        set({ currentTrack: track, progress: 0, isPlaying: true, seekRequest: null });
      },

      playNextFromQueue: (track) => set((state) => ({ queue: [track, ...state.queue] })),

      addToQueue: (track) => set((state) => ({ 
        queue: [...state.queue, track],
        originalQueue: [...state.originalQueue, track]
      })),

      setQueue: (tracks) => set({ queue: tracks, originalQueue: tracks }),

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
          return { isShuffle, queue: state.originalQueue };
        }
      }),

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      nextTrack: () => {
        const { queue, repeatMode, currentTrack, originalQueue } = get();
        if (repeatMode === 'one' && currentTrack) {
          set({ progress: 0, seekRequest: 0, isPlaying: true });
          return;
        }
        if (queue.length > 0) {
          set({ currentTrack: queue[0], queue: queue.slice(1), progress: 0, seekRequest: null, isPlaying: true });
        } else if (repeatMode === 'all' && originalQueue.length > 0) {
          set({ currentTrack: originalQueue[0], queue: originalQueue.slice(1), progress: 0, seekRequest: null, isPlaying: true });
        } else {
          set({ isPlaying: false });
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
            seekRequest: null,
            isPlaying: true
          });
        }
      },
    }),
    {
      name: 'vibecraft-saavn-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        volume: state.volume, 
        history: state.history,
        likedTrackIds: state.likedTrackIds,
        repeatMode: state.repeatMode,
        isShuffle: state.isShuffle,
        queue: state.queue
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        if (rehydratedState) {
          rehydratedState.hasHydrated = true;
          if (!Array.isArray(rehydratedState.likedTrackIds)) rehydratedState.likedTrackIds = [];
        }
      }
    }
  )
);
