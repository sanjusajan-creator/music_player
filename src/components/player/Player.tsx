"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, 
  Heart, Maximize2, Music, Loader2, Shuffle, Repeat, 
  VolumeX, ListMusic, Trash2, X, Share2, Moon, Clock
} from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { generateLyrics } from '@/ai/flows/generate-lyrics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';

export const Player: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    currentTrack, isPlaying, setIsPlaying, nextTrack, previousTrack, 
    progress, duration, volume, setVolume, isAdPlaying, likedTrackIds, toggleLike, seekTo,
    isShuffle, toggleShuffle, repeatMode, setRepeatMode, hasHydrated,
    queue, clearQueue
  } = usePlayerStore();
  
  const { user } = useUser();
  const db = useFirestore();

  const isFullPlayer = searchParams.get('view') === 'full';
  const isLyricsSheetOpen = searchParams.get('sheet') === 'lyrics';
  const isQueueSheetOpen = searchParams.get('sheet') === 'queue';

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);

  // Sync Global Like Status
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db || !currentTrack) return;
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', currentTrack.id);
    toggleLike(currentTrack.id);
    if (isLiked) deleteDocumentNonBlocking(likeRef);
    else setDocumentNonBlocking(likeRef, { 
      id: currentTrack.id, 
      userId: user.uid, 
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnailUrl: currentTrack.thumbnail,
      durationSeconds: currentTrack.duration || 0,
      likedAt: new Date().toISOString() 
    }, { merge: true });
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const fetchLyrics = async () => {
    if (!currentTrack || lyrics) {
      openSheet('lyrics');
      return;
    }
    setIsLoadingLyrics(true);
    openSheet('lyrics');
    try {
      const result = await generateLyrics({ title: currentTrack.title, artist: currentTrack.artist });
      setLyrics(result.lyrics);
    } catch (e) {
      setLyrics("Oracle silent. Try again later.");
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const closeOverlays = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('view');
    params.delete('sheet');
    router.push(`/?${params.toString()}`);
  };

  const openSheet = (type: 'lyrics' | 'queue') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', type);
    router.push(`/?${params.toString()}`);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentTrack || !hasHydrated) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] h-24 bg-black border-t border-white/5 flex items-center px-4 gap-4">
      {/* Track Info (Left) */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className="relative group shrink-0" onClick={() => router.push(`/?view=full&${searchParams.toString()}`)}>
          <img src={currentTrack.thumbnail} className="w-14 h-14 rounded-md shadow-lg object-cover" alt="artwork" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-white truncate hover:underline cursor-pointer tracking-tighter">{currentTrack.title}</span>
          <span className="text-[10px] text-muted-foreground truncate font-black hover:text-white transition-all cursor-pointer uppercase tracking-widest">{currentTrack.artist}</span>
        </div>
        <button onClick={handleLike} className="ml-2">
          <Heart className={cn("w-5 h-5 transition-all", isLiked ? "fill-primary text-primary" : "text-muted-foreground hover:text-white")} />
        </button>
      </div>

      {/* Controls (Center) */}
      <div className="flex-[2] max-w-2xl flex flex-col items-center gap-1">
        <div className="flex items-center gap-6">
          <button onClick={() => toggleShuffle()} className={cn("transition-all", isShuffle ? "text-primary" : "text-muted-foreground hover:text-white")}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={previousTrack} className="text-muted-foreground hover:text-white transition-all"><SkipBack className="w-6 h-6 fill-current" /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-all active:scale-95"
          >
            {isPlaying ? <Pause className="fill-black text-black w-5 h-5" /> : <Play className="fill-black text-black w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-muted-foreground hover:text-white transition-all"><SkipForward className="fill-current w-6 h-6" /></button>
          <button 
            onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
            className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary" : "text-muted-foreground hover:text-white")}
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && <span className="absolute -top-1 right-0 text-[8px] font-black">1</span>}
          </button>
        </div>
        <div className="flex items-center gap-3 w-full px-4">
          <span className="text-[10px] font-black text-muted-foreground w-10 text-right">{formatTime(progress)}</span>
          <Slider 
            value={[progress]} 
            max={duration || 100} 
            step={1}
            onValueChange={(v) => seekTo(v[0])} 
            className="flex-1 cursor-pointer h-1" 
          />
          <span className="text-[10px] font-black text-muted-foreground w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Utilities (Right) */}
      <div className="flex-1 flex items-center justify-end gap-4">
        <button onClick={fetchLyrics} className={cn("transition-all", isLyricsSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
          <Music className="w-5 h-5" />
        </button>
        <button onClick={() => openSheet('queue')} className={cn("transition-all", isQueueSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
          <ListMusic className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 w-32 ml-4">
          <button onClick={handleToggleMute}>
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4 text-muted-foreground hover:text-white" />}
          </button>
          <Slider value={[volume]} max={100} onValueChange={(v) => { setVolume(v[0]); if(v[0]>0) setIsMuted(false); }} className="h-1" />
        </div>
      </div>

      {/* Sheets Integration */}
      <LyricsSheet isOpen={isLyricsSheetOpen} lyrics={lyrics} isLoading={isLoadingLyrics} onOpenChange={(o) => !o && closeOverlays()} />
      <QueueSheet isOpen={isQueueSheetOpen} onOpenChange={(o) => !o && closeOverlays()} />
    </div>
  );
};

const LyricsSheet = ({ isOpen, lyrics, isLoading, onOpenChange }: { isOpen: boolean, lyrics: string | null, isLoading: boolean, onOpenChange: (open: boolean) => void }) => (
  <Sheet open={isOpen} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="bg-black border-l border-white/10 text-white p-0 w-full sm:max-w-md">
      <div className="h-full flex flex-col p-8 relative">
        <SheetClose className="absolute top-6 right-6 text-muted-foreground hover:text-white"><X className="w-8 h-8" /></SheetClose>
        <SheetHeader className="mb-10 text-center">
          <SheetTitle className="text-primary font-black uppercase tracking-[0.4em] text-2xl gold-glow">The Scroll</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <p className="text-xl font-black whitespace-pre-wrap leading-[2.5] tracking-wide text-center uppercase">{lyrics || "Searching archives..."}</p>
          )}
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
);

const QueueSheet = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
  const { queue, currentTrack, removeFromQueue, clearQueue } = usePlayerStore();
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-black border-l border-white/10 text-white p-0 w-full sm:max-w-md">
        <div className="h-full flex flex-col p-8 relative">
          <SheetClose className="absolute top-6 right-6 text-muted-foreground hover:text-white"><X className="w-8 h-8" /></SheetClose>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <SheetTitle className="text-primary font-black uppercase tracking-[0.4em] text-2xl gold-glow">The Queue</SheetTitle>
            <Button variant="ghost" size="sm" onClick={clearQueue} className="text-destructive font-black text-[10px] uppercase">Clear</Button>
          </SheetHeader>
          <ScrollArea className="flex-1 pr-4 custom-scrollbar">
            <div className="space-y-8">
              {currentTrack && (
                <section>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">Now Manifesting</p>
                  <QueueItem track={currentTrack} isActive />
                </section>
              )}
              <section>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">Upcoming</p>
                {queue.length > 0 ? (
                  <div className="space-y-4">
                    {queue.map((t, i) => <QueueItem key={`${t.id}-${i}`} track={t} onRemove={() => removeFromQueue(t.id)} />)}
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl text-[10px] uppercase text-muted-foreground">Queue is silent</div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const QueueItem = ({ track, isActive, onRemove }: { track: Track, isActive?: boolean, onRemove?: () => void }) => (
  <div className={cn("flex items-center gap-4 group p-2 rounded-lg transition-all", isActive ? "bg-white/10" : "hover:bg-white/5")}>
    <img src={track.thumbnail} className="w-10 h-10 rounded shadow-md object-cover" alt="track" />
    <div className="flex-1 min-w-0">
      <p className={cn("text-xs font-black truncate", isActive ? "text-primary" : "text-white")}>{track.title}</p>
      <p className="text-[9px] font-black text-muted-foreground uppercase truncate tracking-widest">{track.artist}</p>
    </div>
    {!isActive && onRemove && (
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);