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
  isPlaying: boolean;
  isBuffering: boolean;
  isAdPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  setQueue: (tracks: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setIsAdPlaying: (isAdPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      history: [],
      isPlaying: false,
      isBuffering: false,
      isAdPlaying: false,
      volume: 80,
      progress: 0,
      duration: 0,
      isMuted: false,
      isRepeat: false,
      isShuffle: false,

      setCurrentTrack: (track) => {
        const { currentTrack, history } = get();
        if (currentTrack && currentTrack.id !== track?.id) {
          set({ history: [currentTrack, ...history.slice(0, 49)] });
        }
        set({ currentTrack: track, progress: 0, isPlaying: true });
      },

      addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
      
      removeFromQueue: (trackId) => 
        set((state) => ({ queue: state.queue.filter((t) => t.id !== trackId) })),

      clearQueue: () => set({ queue: [] }),
      
      setQueue: (tracks) => set({ queue: tracks }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      setIsBuffering: (isBuffering) => set({ isBuffering }),
      
      setIsAdPlaying: (isAdPlaying) => set({ isAdPlaying }),

      setVolume: (volume) => set({ volume }),
      
      setProgress: (progress) => set({ progress }),
      
      setDuration: (duration) => set({ duration }),

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),

      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

      nextTrack: () => {
        const { queue, currentTrack } = get();
        if (queue.length > 0) {
          const next = queue[0];
          set({ 
            currentTrack: next, 
            queue: queue.slice(1),
            progress: 0 
          });
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
            progress: 0
          });
        }
      },
    }),
    {
      name: 'vibecraft-player-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        history: state.history,
        isRepeat: state.isRepeat,
        isShuffle: state.isShuffle,
        // We don't persist active playback state to avoid issues on reload
      }),
    }
  )
);