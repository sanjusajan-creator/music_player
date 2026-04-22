import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  likedTrackIds: Set<string>;
  isPlaying: boolean;
  isBuffering: boolean;
  isAdPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  setLikedTracks: (ids: string[]) => void;
  toggleLike: (trackId: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setIsAdPlaying: (isAdPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      history: [],
      likedTrackIds: new Set(),
      isPlaying: false,
      isBuffering: false,
      isAdPlaying: false,
      volume: 80,
      progress: 0,
      duration: 0,

      setCurrentTrack: (track) => {
        const { currentTrack, history } = get();
        if (currentTrack && currentTrack.id !== track?.id) {
          set({ history: [currentTrack, ...history.slice(0, 49)] });
        }
        set({ currentTrack: track, progress: 0, isPlaying: true, isAdPlaying: false });
      },

      addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
      removeFromQueue: (trackId) => set((state) => ({ queue: state.queue.filter((t) => t.id !== trackId) })),
      
      setLikedTracks: (ids) => set({ likedTrackIds: new Set(ids) }),
      toggleLike: (trackId) => set((state) => {
        const next = new Set(state.likedTrackIds);
        if (next.has(trackId)) next.delete(trackId);
        else next.add(trackId);
        return { likedTrackIds: next };
      }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsBuffering: (isBuffering) => set({ isBuffering }),
      setIsAdPlaying: (isAdPlaying) => set({ isAdPlaying }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),

      nextTrack: () => {
        const { queue } = get();
        if (queue.length > 0) {
          set({ currentTrack: queue[0], queue: queue.slice(1), progress: 0 });
        }
      },

      previousTrack: () => {
        const { history, currentTrack, queue } = get();
        if (history.length > 0) {
          set({ currentTrack: history[0], history: history.slice(1), queue: currentTrack ? [currentTrack, ...queue] : queue, progress: 0 });
        }
      },
    }),
    {
      name: 'vibecraft-player-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        volume: state.volume, 
        history: state.history,
        likedTrackIds: Array.from(state.likedTrackIds) as any
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.likedTrackIds)) {
          state.likedTrackIds = new Set(state.likedTrackIds);
        }
      }
    }
  )
);