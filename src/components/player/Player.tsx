"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, 
  Heart, Maximize2, Music, Loader2, Shuffle, Repeat, 
  VolumeX, ListMusic, X, Share2, Youtube, Moon, Clock, MoreVertical
} from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn, getImage } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { generateLyrics } from '@/ai/flows/generate-lyrics';
import { getLyricsAction } from '@/app/actions/youtube-search';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export const Player: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    currentTrack, isPlaying, setIsPlaying, nextTrack, previousTrack, 
    progress, duration, volume, setVolume, likedTrackIds, toggleLike, seekTo,
    isShuffle, toggleShuffle, repeatMode, setRepeatMode, hasHydrated,
    queue, sleepTimer, setSleepTimer
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
      thumbnailUrl: getImage(currentTrack),
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
    openSheet('lyrics');
    
    if (lyrics && lyrics.includes(currentTrack.title)) return;
    
    setIsLoadingLyrics(true);
    try {
      const apiLyrics = await getLyricsAction(currentTrack.id, currentTrack.url);
      if (apiLyrics) {
        setLyrics(apiLyrics);
      } else {
        const result = await generateLyrics({ title: currentTrack.title, artist: currentTrack.artist });
        setLyrics(result.lyrics);
      }
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

  const formatSleepTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
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
            className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh] overflow-hidden select-none"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black pointer-events-none opacity-50" />
            
            {/* 1. TOP SECTION: Info & Navigation */}
            <div className="pt-[env(safe-area-inset-top)] px-6 shrink-0 z-10">
              <div className="h-16 flex items-center justify-between">
                <button onClick={closeOverlays} className="text-primary hover:scale-110 transition-transform p-2 -ml-2">
                  <ChevronDown className="w-8 h-8" />
                </button>
                
                <div className="flex flex-col items-center flex-1 px-4 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">Now Manifesting</span>
                  <div className="flex flex-col items-center w-full">
                    <h2 className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-full text-center">
                      {currentTrack.title}
                    </h2>
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest truncate max-w-full">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 -mr-2">
                  <SleepTimerButton />
                  <button onClick={() => openSheet('queue')} className="text-primary p-2">
                    <ListMusic className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. CENTER SECTION: Flexible Artwork */}
            <div className="flex-1 flex items-center justify-center p-8 md:p-12 min-h-0 z-10">
              <motion.div 
                layoutId="player-artwork"
                className="relative w-full max-w-[400px] aspect-square group"
              >
                <img 
                  src={getImage(currentTrack)} 
                  className="w-full h-full object-cover rounded-[2.5rem] shadow-[0_0_100px_rgba(255,215,0,0.15)] gold-border-glow" 
                  alt="art" 
                />
                {currentTrack.isYouTube && (
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-primary" />
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">YouTube Discovery</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* 3. BOTTOM SECTION: Controls (Fixed Priority) */}
            <div className="pb-[calc(env(safe-area-inset-bottom)+2rem)] px-8 space-y-8 shrink-0 z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-white gold-glow tracking-tighter uppercase leading-none truncate break-words">
                    {currentTrack.title}
                  </h1>
                  <p className="text-sm font-black text-primary/60 uppercase tracking-[0.2em] truncate">
                    {currentTrack.artist}
                  </p>
                </div>
                <button onClick={handleLike} className="shrink-0 p-2">
                  <Heart className={cn("w-7 h-7 transition-all", isLiked ? "fill-primary text-primary" : "text-primary/20")} />
                </button>
              </div>

              <div className="space-y-3">
                <Slider 
                  value={[progress]} 
                  max={duration || 100} 
                  onValueChange={(v) => seekTo(v[0])} 
                  className="h-1.5" 
                />
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary/40">
                  <span>{formatTime(progress)}</span>
                  <div className="flex items-center gap-2">
                    {sleepTimer !== null && (
                      <span className="text-primary flex items-center gap-1 animate-pulse mr-2">
                        <Moon className="w-3 h-3" /> {formatSleepTimer(sleepTimer)}
                      </span>
                    )}
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button onClick={toggleShuffle} className={cn("transition-all p-2", isShuffle ? "text-primary" : "text-primary/20")}>
                  <Shuffle className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-8 md:gap-12">
                  <button onClick={previousTrack} className="text-white hover:text-primary transition-all">
                    <SkipBack className="w-10 h-10 fill-current" />
                  </button>
                  
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-20 h-20 bg-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 fill-black text-black" />
                    ) : (
                      <Play className="w-10 h-10 fill-black text-black ml-1.5" />
                    )}
                  </button>
                  
                  <button onClick={nextTrack} className="text-white hover:text-primary transition-all">
                    <SkipForward className="w-10 h-10 fill-current" />
                  </button>
                </div>

                {!currentTrack.isYouTube ? (
                  <button onClick={fetchLyrics} className="text-primary/20 hover:text-primary p-2">
                    <Music className="w-6 h-6" />
                  </button>
                ) : (
                  <div className="w-10" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player: Desktop & Mobile Bottom Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[60] h-20 md:h-24 bg-[#000000] backdrop-blur-xl border-t border-primary/20 flex items-center px-4 md:px-6 gap-4 shadow-2xl pointer-events-auto">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="relative group shrink-0" onClick={() => router.push(`/?view=full&${searchParams.toString()}`)}>
            <motion.img 
              layoutId="player-artwork"
              src={getImage(currentTrack)} 
              className="w-12 h-12 md:w-14 md:h-14 rounded shadow-lg object-cover gold-border-glow cursor-pointer" 
              alt="artwork" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer rounded">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span onClick={() => router.push(`/?view=full&${searchParams.toString()}`)} className="text-xs md:text-sm font-black text-white truncate hover:text-primary cursor-pointer tracking-tighter uppercase">{currentTrack.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] text-muted-foreground truncate font-black hover:text-white transition-all cursor-pointer uppercase tracking-widest">{currentTrack.artist}</span>
              {currentTrack.isYouTube && <Youtube className="w-3 h-3 text-primary" />}
            </div>
          </div>
          <button onClick={handleLike} className="ml-2">
            <Heart className={cn("w-4 h-4 md:w-5 md:h-5 transition-all", isLiked ? "fill-primary text-primary" : "text-muted-foreground hover:text-white")} />
          </button>
        </div>

        {!currentTrack.isYouTube ? (
          <div className="flex-[2] max-w-2xl flex flex-col items-center gap-1">
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
              <div className="hidden md:block">
                 <Repeat className="w-4 h-4 text-muted-foreground opacity-30" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full px-2 hidden md:flex">
              <span className="text-[9px] font-black text-muted-foreground w-8 text-right">{formatTime(progress)}</span>
              <Slider 
                value={[progress]} 
                max={duration || 100} 
                onValueChange={(v) => seekTo(v[0])} 
                className="flex-1 cursor-pointer h-1" 
              />
              <span className="text-[9px] font-black text-muted-foreground w-8">{formatTime(duration)}</span>
            </div>
          </div>
        ) : (
          <div className="flex-[2] flex items-center justify-center">
             <button onClick={() => window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}`, '_blank')} className="text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:gold-glow flex items-center gap-2">
               <Youtube className="w-4 h-4" /> Video Mode
             </button>
          </div>
        )}

        <div className="flex-1 flex items-center justify-end gap-3 md:gap-4">
          {!currentTrack.isYouTube && (
            <button onClick={fetchLyrics} title="Lyrics" className={cn("transition-all", isLyricsSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
              <Music className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
          <SleepTimerButton />
          <button onClick={() => openSheet('queue')} title="Queue" className={cn("transition-all", isQueueSheetOpen ? "text-primary" : "text-muted-foreground hover:text-white")}>
            <ListMusic className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 w-24 md:w-32 ml-2 hidden lg:flex">
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

const SleepTimerButton = () => {
  const { sleepTimer, setSleepTimer } = usePlayerStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Sleep Timer" className={cn("transition-all relative p-2 rounded-full hover:bg-white/5", sleepTimer !== null ? "text-primary" : "text-muted-foreground hover:text-white")}>
          <Moon className="w-5 h-5 md:w-6 md:h-6" />
          {sleepTimer !== null && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(255,215,0,0.8)]" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        side="top" 
        className="bg-[#0a0a0a] border border-primary/20 text-white font-black uppercase text-[10px] z-[120] p-1 min-w-[140px]"
      >
        <DropdownMenuItem onClick={() => setSleepTimer(15)} className="focus:bg-primary/10 cursor-pointer p-2 rounded-md">15 Minutes</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSleepTimer(30)} className="focus:bg-primary/10 cursor-pointer p-2 rounded-md">30 Minutes</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSleepTimer(45)} className="focus:bg-primary/10 cursor-pointer p-2 rounded-md">45 Minutes</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSleepTimer(60)} className="focus:bg-primary/10 cursor-pointer p-2 rounded-md">60 Minutes</DropdownMenuItem>
        {sleepTimer !== null && (
          <DropdownMenuItem onClick={() => setSleepTimer(null)} className="text-red-500 focus:bg-red-500/10 cursor-pointer p-2 rounded-md border-t border-primary/10 mt-1">Stop Timer</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const LyricsSheet = ({ isOpen, lyrics, isLoading, onOpenChange }: { isOpen: boolean, lyrics: string | null, isLoading: boolean, onOpenChange: (open: boolean) => void }) => (
  <Sheet open={isOpen} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="bg-black border-l border-white/10 text-white p-0 w-full sm:max-w-md z-[110]">
      <div className="h-full flex flex-col p-6 relative">
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
      <SheetContent side="right" className="bg-black border-l border-white/10 text-white p-0 w-full sm:max-w-md z-[110]">
        <div className="h-full flex flex-col p-6 relative">
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

const QueueItem = ({ track, isActive, onRemove }: { track: Track, isActive?: boolean, onRemove?: () => void }) => {
  const { setCurrentTrack } = usePlayerStore();
  return (
    <div onClick={() => setCurrentTrack(track)} className={cn("flex items-center gap-4 group p-2 rounded-xl transition-all cursor-pointer", isActive ? "bg-white/10 border border-primary/20" : "hover:bg-white/5 border border-transparent")}>
      <img src={track.thumbnail} className="w-10 h-10 rounded shadow-md object-cover" alt="track" />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-black truncate uppercase tracking-tighter", isActive ? "text-primary" : "text-white")}>{track.title}</p>
        <div className="flex items-center gap-2">
          <p className="text-[9px] font-black text-muted-foreground uppercase truncate tracking-widest">{track.artist}</p>
          {track.isYouTube && <Youtube className="w-3 h-3 text-primary" />}
        </div>
      </div>
      {!isActive && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
