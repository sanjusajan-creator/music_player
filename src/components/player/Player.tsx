"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, 
  Heart, Maximize2, Music, Loader2, Shuffle, Repeat, 
  VolumeX, ListMusic, Trash2, X, Share2, Moon, Clock, ChevronUp
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
    progress, duration, volume, setVolume, likedTrackIds, toggleLike, seekTo,
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

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const fetchLyrics = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    if (lyrics && lyrics.includes(currentTrack.title)) {
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
    <>
      <AnimatePresence>
        {isFullPlayer && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black pointer-events-none" />
            <div className="p-8 flex items-center justify-between z-10">
              <button onClick={closeOverlays} className="text-white/60 hover:text-white transition-all"><ChevronDown className="w-10 h-10" /></button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Now Manifesting</span>
                <span className="text-xs font-black uppercase tracking-widest text-primary truncate max-w-[200px]">{currentTrack.album || "Sovereign Track"}</span>
              </div>
              <button className="text-white/60 hover:text-white transition-all"><Share2 className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 md:gap-12 z-10">
              <motion.img 
                layoutId="player-artwork"
                src={currentTrack.thumbnail} 
                className="w-full max-w-[300px] md:max-w-md aspect-square rounded-[2rem] md:rounded-[3rem] shadow-[0_0_80px_rgba(212,175,55,0.15)] gold-border-glow object-cover" 
                alt="art" 
              />
              <div className="w-full max-w-xl space-y-2 text-center">
                <h1 className="text-3xl md:text-6xl font-black text-white gold-glow tracking-tighter uppercase leading-none">{currentTrack.title}</h1>
                <p className="text-sm md:text-lg font-black text-primary/60 uppercase tracking-[0.2em]">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="p-8 md:p-12 w-full max-w-3xl mx-auto space-y-8 z-10">
              <div className="space-y-4">
                <Slider 
                  value={[progress]} 
                  max={duration || 100} 
                  onValueChange={(v) => seekTo(v[0])} 
                  className="h-2" 
                />
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button onClick={toggleShuffle} className={cn("transition-all", isShuffle ? "text-primary" : "text-white/40")}><Shuffle className="w-6 h-6" /></button>
                <div className="flex items-center gap-6 md:gap-10">
                  <button onClick={previousTrack} className="text-white hover:text-primary transition-all"><SkipBack className="w-8 h-8 md:w-10 md:h-10 fill-current" /></button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-black text-black" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-black text-black ml-1.5" />}
                  </button>
                  <button onClick={nextTrack} className="text-white hover:text-primary transition-all"><SkipForward className="w-8 h-8 md:w-10 md:h-10 fill-current" /></button>
                </div>
                <button 
                  onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
                  className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary" : "text-white/40")}
                >
                  <Repeat className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 md:bottom-0 left-0 right-0 z-[60] h-20 md:h-24 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center px-4 md:px-6 gap-4 md:gap-6 shadow-2xl">
        {/* Track Info (Left) */}
        <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
          <div className="relative group shrink-0" onClick={() => router.push(`/?view=full&${searchParams.toString()}`)}>
            <motion.img 
              layoutId="player-artwork"
              src={currentTrack.thumbnail} 
              className="w-12 h-12 md:w-14 md:h-14 rounded-lg shadow-lg object-cover gold-border-glow cursor-pointer" 
              alt="artwork" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer rounded-lg">
              <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span onClick={() => router.push(`/?view=full&${searchParams.toString()}`)} className="text-xs md:text-sm font-black text-white truncate hover:text-primary cursor-pointer tracking-tighter uppercase">{currentTrack.title}</span>
            <span className="text-[9px] md:text-[10px] text-muted-foreground truncate font-black hover:text-white transition-all cursor-pointer uppercase tracking-widest">{currentTrack.artist}</span>
          </div>
          <button onClick={handleLike} className="ml-1 md:ml-2">
            <Heart className={cn("w-4 h-4 md:w-5 md:h-5 transition-all", isLiked ? "fill-primary text-primary" : "text-muted-foreground hover:text-white")} />
          </button>
        </div>

        {/* Controls (Center) - Hidden on smallest mobile if needed, but here responsive */}
        <div className="flex-[2] max-w-2xl flex flex-col items-center gap-1 md:gap-2">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={toggleShuffle} className={cn("transition-all hidden md:block", isShuffle ? "text-primary" : "text-muted-foreground hover:text-white")}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={previousTrack} className="text-muted-foreground hover:text-white transition-all"><SkipBack className="w-5 h-5 md:w-6 md:h-6 fill-current" /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-xl"
            >
              {isPlaying ? <Pause className="fill-black text-black w-4 h-4 md:w-5 md:h-5" /> : <Play className="fill-black text-black w-4 h-4 md:w-5 md:h-5 ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-muted-foreground hover:text-white transition-all"><SkipForward className="fill-current w-5 h-5 md:w-6 md:h-6" /></button>
            <button 
              onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
              className={cn("transition-all relative hidden md:block", repeatMode !== 'none' ? "text-primary" : "text-muted-foreground hover:text-white")}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1 text-[8px] font-black">1</span>}
            </button>
          </div>
          <div className="flex items-center gap-3 w-full px-2 md:px-4">
            <span className="text-[9px] md:text-[10px] font-black text-muted-foreground w-8 md:w-10 text-right">{formatTime(progress)}</span>
            <Slider 
              value={[progress]} 
              max={duration || 100} 
              onValueChange={(v) => seekTo(v[0])} 
              className="flex-1 cursor-pointer h-1" 
            />
            <span className="text-[9px] md:text-[10px] font-black text-muted-foreground w-8 md:w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Utilities (Right) - Desktop only or simplified on mobile */}
        <div className="flex-1 flex items-center justify-end gap-3 md:gap-5">
          <button onClick={fetchLyrics} className={cn("transition-all", isLyricsSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
            <Music className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={() => openSheet('queue')} className={cn("transition-all hidden md:block", isQueueSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
            <ListMusic className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 w-24 md:w-32 ml-1 md:ml-2 hidden sm:flex">
            <button onClick={handleToggleMute}>
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4 text-muted-foreground hover:text-white" />}
            </button>
            <Slider value={[volume]} max={100} onValueChange={(v) => { setVolume(v[0]); if(v[0]>0) setIsMuted(false); }} className="h-1" />
          </div>
        </div>
      </div>

      <LyricsSheet isOpen={isLyricsSheetOpen} lyrics={lyrics} isLoading={isLoadingLyrics} onOpenChange={(o) => !o && closeOverlays()} />
      <QueueSheet isOpen={isQueueSheetOpen} onOpenChange={(o) => !o && closeOverlays()} />
    </>
  );
};

const LyricsSheet = ({ isOpen, lyrics, isLoading, onOpenChange }: { isOpen: boolean, lyrics: string | null, isLoading: boolean, onOpenChange: (open: boolean) => void }) => (
  <Sheet open={isOpen} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="bg-black border-l border-white/10 text-white p-0 w-full sm:max-w-md">
      <div className="h-full flex flex-col p-6 md:p-8 relative">
        <SheetClose className="absolute top-6 right-6 text-muted-foreground hover:text-white"><X className="w-8 h-8" /></SheetClose>
        <SheetHeader className="mb-10 text-center">
          <SheetTitle className="text-primary font-black uppercase tracking-[0.4em] text-2xl gold-glow">The Scroll</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <p className="text-lg md:text-xl font-black whitespace-pre-wrap leading-[2.5] tracking-wide text-center uppercase text-white/80">{lyrics || "Searching archives..."}</p>
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
        <div className="h-full flex flex-col p-6 md:p-8 relative">
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
  <div className={cn("flex items-center gap-4 group p-2 rounded-xl transition-all", isActive ? "bg-white/10 border border-primary/20" : "hover:bg-white/5 border border-transparent")}>
    <img src={track.thumbnail} className="w-10 h-10 rounded shadow-md object-cover" alt="track" />
    <div className="flex-1 min-w-0">
      <p className={cn("text-xs font-black truncate uppercase tracking-tighter", isActive ? "text-primary" : "text-white")}>{track.title}</p>
      <p className="text-[9px] font-black text-muted-foreground uppercase truncate tracking-widest">{track.artist}</p>
    </div>
    {!isActive && onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);
