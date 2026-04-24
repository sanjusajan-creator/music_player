"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, 
  Heart, Maximize2, Music, Loader2, Shuffle, Repeat, 
  Share2, Moon, Clock, VolumeX, ListMusic, Trash2, X
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
import { toast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getRelatedVideos } from '@/lib/youtube';

export const Player: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    currentTrack, isPlaying, setIsPlaying, nextTrack, previousTrack, 
    progress, duration, volume, setVolume, isAdPlaying, likedTrackIds, toggleLike, seekTo,
    isShuffle, toggleShuffle, repeatMode, setRepeatMode, hasHydrated,
    sleepTimer, setSleepTimer, queue, removeFromQueue, clearQueue
  } = usePlayerStore();
  
  const { user } = useUser();
  const db = useFirestore();

  // URL state for back-button functionality
  const isFullPlayer = searchParams.get('view') === 'full';
  const isLyricsSheetOpen = searchParams.get('sheet') === 'lyrics';
  const isQueueSheetOpen = searchParams.get('sheet') === 'queue';

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);
  const [showLyricsInFull, setShowLyricsInFull] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) nextTrack();
          else seekTo(Math.min(duration, progress + 10));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) previousTrack();
          else seekTo(Math.max(0, progress - 10));
          break;
        case 'KeyM':
          handleToggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, progress, duration, nextTrack, previousTrack, seekTo]);

  // Sleep Timer logic
  useEffect(() => {
    if (sleepTimer === null || sleepTimer <= 0) return;
    const interval = setInterval(() => {
      if (sleepTimer <= 1) {
        setIsPlaying(false);
        setSleepTimer(null);
        toast({ title: "Sleep Timer", description: "Playback paused. Goodnight." });
      } else {
        setSleepTimer(sleepTimer - 1);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [sleepTimer, setSleepTimer, setIsPlaying]);

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

  const handleShare = () => {
    if (!currentTrack) return;
    const url = `https://music.youtube.com/watch?v=${currentTrack.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Shared!", description: "Track link copied to clipboard." });
  };

  useEffect(() => {
    if (currentTrack) {
      setLyrics(null);
      setShowLyricsInFull(false);
    }
  }, [currentTrack]);

  const fetchLyrics = async () => {
    if (!currentTrack) return;
    
    if (isFullPlayer) {
      if (lyrics) {
        setShowLyricsInFull(!showLyricsInFull);
        return;
      }
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sheet', 'lyrics');
      router.push(`/?${params.toString()}`);
    }

    if (lyrics) return;

    setIsLoadingLyrics(true);
    try {
      const result = await generateLyrics({ title: currentTrack.title, artist: currentTrack.artist });
      setLyrics(result.lyrics);
      if (isFullPlayer) setShowLyricsInFull(true);
    } catch (error) {
      setLyrics("Lyrics archive unavailable. The Oracle is silent.");
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

  const openFullPlayer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'full');
    router.push(`/?${params.toString()}`);
  };

  const openSheet = (sheetType: 'lyrics' | 'queue') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', sheetType);
    router.push(`/?${params.toString()}`);
  };

  if (!currentTrack || !hasHydrated) return null;

  // FIX: likedTrackIds is an Array now to support JSON serialization
  const isLiked = likedTrackIds.includes(currentTrack.id);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', currentTrack.id);
    toggleLike(currentTrack.id);
    if (isLiked) deleteDocumentNonBlocking(likeRef);
    else setDocumentNonBlocking(likeRef, { 
      id: currentTrack.id, 
      userId: user.uid, 
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnailUrl: currentTrack.thumbnail,
      durationSeconds: currentTrack.duration,
      likedAt: new Date().toISOString() 
    }, { merge: true });
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleRepeatToggle = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <>
      <AnimatePresence>
        {!isFullPlayer && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[60] h-24 bg-black/95 border-t border-primary/20 flex items-center px-4 md:px-12 gap-4 md:gap-6 backdrop-blur-3xl"
          >
            <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0 cursor-pointer" onClick={openFullPlayer}>
              <div className="relative group shrink-0">
                <img src={currentTrack.thumbnail} className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl border border-primary/30 shadow-2xl object-cover" alt="cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl md:rounded-2xl">
                  <Maximize2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs md:text-sm font-black text-primary truncate gold-glow uppercase tracking-tighter">{currentTrack.title}</span>
                <span className="text-[8px] md:text-[9px] text-muted-foreground truncate uppercase tracking-[0.3em] font-black">{currentTrack.artist}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLike} className="text-primary ml-1 shrink-0">
                <Heart className={cn("w-4 h-4 md:w-5 md:h-5", isLiked && "fill-primary")} />
              </Button>
            </div>

            <div className="hidden md:flex flex-col items-center gap-1.5 flex-[2] max-w-2xl">
              <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => toggleShuffle()} className={cn("transition-all", isShuffle ? "text-primary" : "text-primary/30")}>
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary/60 hover:text-primary active:scale-90"><SkipBack className="w-5 h-5" /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 border-2 border-primary/40 rounded-full hover:bg-primary/10 transition-all bg-primary/5 active:scale-95" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="fill-primary text-primary w-5 h-5" /> : <Play className="fill-primary text-primary ml-0.5 w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary/60 hover:text-primary active:scale-90"><SkipForward className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" onClick={handleRepeatToggle} className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary" : "text-primary/30")}>
                  <Repeat className="w-4 h-4" />
                  {repeatMode === 'one' && <span className="absolute -top-1 right-0 text-[8px] font-black">1</span>}
                </Button>
              </div>
              <div className="flex items-center gap-4 w-full px-2">
                <span className="text-[9px] font-mono font-black text-primary/40 w-10 text-right">{formatTime(progress)}</span>
                <Slider 
                  value={[progress]} 
                  max={duration || 100} 
                  step={1}
                  onValueChange={(v) => seekTo(v[0])} 
                  className="cursor-pointer flex-1 h-1" 
                />
                <span className="text-[9px] font-mono font-black text-primary/40 w-10">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 md:gap-3">
               <div className="flex md:hidden items-center">
                  <Button variant="ghost" size="icon" className="text-primary" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="w-6 h-6 fill-primary" /> : <Play className="w-6 h-6 fill-primary ml-0.5" />}
                  </Button>
               </div>

               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" className={cn("hidden md:flex text-primary/60 hover:text-primary", sleepTimer && "text-primary")}>
                     <Moon className="w-5 h-5" />
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="bg-black border-primary/20 w-48 p-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-2 px-2">Sleep Timer</p>
                    {[15, 30, 45, 60].map(m => (
                      <Button key={m} variant="ghost" className="w-full justify-start text-xs font-black uppercase" onClick={() => setSleepTimer(m)}>
                        <Clock className="w-3 h-3 mr-2" /> {m} minutes
                      </Button>
                    ))}
                    <Button variant="ghost" className="w-full justify-start text-xs font-black text-destructive uppercase" onClick={() => setSleepTimer(null)}>
                      Off
                    </Button>
                 </PopoverContent>
               </Popover>

               <Button variant="ghost" size="icon" onClick={handleShare} className="hidden md:flex text-primary/60 hover:text-primary">
                 <Share2 className="w-5 h-5" />
               </Button>

               <QueueSheet isOpen={isQueueSheetOpen} onOpenChange={(open) => !open && closeOverlays()} />

               <Sheet open={isLyricsSheetOpen} onOpenChange={(open) => !open && closeOverlays()}>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" onClick={fetchLyrics} className="text-primary/60 hover:text-primary">
                     <Music className="w-5 h-5" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right" className="bg-black border-l border-primary/20 text-primary p-0 w-full sm:max-w-md">
                   <div className="h-full flex flex-col p-8 md:p-10 relative">
                     <SheetClose className="absolute top-6 right-6 text-primary hover:text-white transition-colors" onClick={closeOverlays}>
                        <X className="w-8 h-8" />
                     </SheetClose>
                     <SheetHeader className="mb-10 text-center">
                       <SheetTitle className="text-primary font-black uppercase tracking-[0.4em] text-2xl md:text-3xl gold-glow">The Scroll</SheetTitle>
                     </SheetHeader>
                     <ScrollArea className="flex-1 pr-4 custom-scrollbar">
                       {isLoadingLyrics ? (
                         <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
                           <Loader2 className="w-10 h-10 animate-spin text-primary" />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Summoning...</p>
                         </div>
                       ) : (
                         <p className="text-lg md:text-xl font-black whitespace-pre-wrap leading-[2.5] tracking-wide text-center">
                           {lyrics || "Silent for now. Manifesting later."}
                         </p>
                       )}
                     </ScrollArea>
                   </div>
                 </SheetContent>
               </Sheet>

               <div className="hidden lg:flex items-center gap-3 w-28 ml-4">
                 <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={handleToggleMute}>
                   {isMuted ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4 text-primary/60" />}
                 </Button>
                 <Slider value={[volume]} max={100} onValueChange={(v) => { setVolume(v[0]); if(v[0]>0) setIsMuted(false); }} className="h-1" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFullPlayer && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[70] bg-black flex flex-col h-[100dvh] w-screen overflow-hidden gradient-bg"
          >
            <div className="flex justify-between items-center h-16 shrink-0 px-6">
              <Button variant="ghost" size="icon" onClick={closeOverlays} className="text-primary active:scale-90">
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.6em] text-primary gold-glow">SANCTUARY</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleShare} className="text-primary/40 hover:text-primary">
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLike} className={cn("active:scale-90", isLiked ? "text-primary" : "text-primary/40")}>
                  <Heart className={cn("w-6 h-6", isLiked && "fill-primary")} />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-12 min-h-0 py-4 overflow-hidden">
              <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 lg:gap-20 h-full max-h-[70vh]">
                 <div className={cn(
                    "aspect-square w-full max-w-[240px] md:max-w-[320px] lg:max-w-[420px] rounded-[2rem] border-4 border-primary/10 overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.15)] relative shrink-0 transition-all duration-700",
                    isAdPlaying && "animate-pulse-gold",
                    showLyricsInFull && "hidden md:block scale-75 opacity-40 grayscale blur-sm"
                 )}>
                    <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-1000", isAdPlaying && "blur-3xl grayscale scale-125")} alt="artwork" />
                 </div>

                 <div className={cn("flex-1 flex flex-col min-w-0 w-full h-full justify-center overflow-hidden", showLyricsInFull ? "block" : "hidden md:flex")}>
                    {showLyricsInFull ? (
                        <div className="h-full flex flex-col overflow-hidden py-4 relative">
                            <h3 className="text-primary font-black uppercase tracking-[0.4em] text-sm md:text-lg mb-4 flex items-center gap-2 shrink-0">
                                <Music className="w-4 h-4" /> Lyrics Scroll
                            </h3>
                            <ScrollArea className="flex-1 pr-4 custom-scrollbar">
                                <p className="text-xl md:text-3xl lg:text-4xl font-black whitespace-pre-wrap leading-[1.8] tracking-tight text-white/90">
                                    {lyrics || "Scanning the archives... the Oracle is manifesting lyrics."}
                                </p>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="text-center md:text-left space-y-4">
                            <h2 className="text-3xl md:text-5xl lg:text-7xl font-black text-primary gold-glow uppercase tracking-tighter leading-tight">
                                {currentTrack.title}
                            </h2>
                            <p className="text-xs md:text-xl lg:text-2xl text-muted-foreground uppercase tracking-[0.4em] font-black opacity-60">
                                {currentTrack.artist}
                            </p>
                        </div>
                    )}
                 </div>
              </div>

              {!showLyricsInFull && (
                <div className="md:hidden mt-6 text-center space-y-1 px-4 max-w-full">
                    <h2 className="text-2xl font-black text-primary gold-glow truncate uppercase tracking-tighter">{currentTrack.title}</h2>
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-[0.4em] font-black opacity-60">{currentTrack.artist}</p>
                </div>
              )}
            </div>

            <div className="px-6 md:px-12 pb-8 md:pb-12 shrink-0 w-full max-w-2xl mx-auto space-y-6 md:space-y-8">
              <div className="space-y-3">
                <Slider 
                  value={[progress]} 
                  max={duration || 100} 
                  step={1}
                  onValueChange={(v) => seekTo(v[0])} 
                  className="cursor-pointer h-1.5" 
                />
                <div className="flex justify-between text-[10px] md:text-xs font-mono text-primary/40 tracking-[0.2em] font-black">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Button variant="ghost" size="icon" onClick={() => toggleShuffle()} className={cn("transition-all", isShuffle ? "text-primary" : "text-primary/20")}>
                  <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
                <div className="flex items-center gap-4 md:gap-10">
                    <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary transition-all active:scale-75"><SkipBack className="w-7 h-7 md:w-10 md:h-10" /></Button>
                    <Button 
                      variant="ghost" 
                      className="w-16 h-16 md:w-24 md:h-24 border-2 border-primary/30 rounded-full hover:bg-primary/10 bg-primary/5 shadow-2xl transition-all active:scale-90 flex items-center justify-center shrink-0" 
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="w-7 h-7 md:w-10 md:h-10 fill-primary text-primary" /> : <Play className="w-7 h-7 md:w-10 md:h-10 fill-primary text-primary ml-1.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary transition-all active:scale-75"><SkipForward className="w-7 h-7 md:w-10 md:h-10" /></Button>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRepeatToggle} className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary" : "text-primary/20")}>
                  <Repeat className="w-5 h-5 md:w-6 md:h-6" />
                  {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-black">1</span>}
                </Button>
              </div>
              
              <div className="flex justify-center gap-4">
                 <Button 
                    variant="ghost" 
                    className={cn(
                        "font-black uppercase text-[10px] tracking-[0.4em] transition-all flex items-center gap-2 px-6 h-12 rounded-full",
                        showLyricsInFull ? "bg-primary text-black" : "text-primary/40 hover:text-primary"
                    )} 
                    onClick={fetchLyrics}
                 >
                   {isLoadingLyrics ? <Loader2 className="animate-spin w-4 h-4" /> : <Music className="w-4 h-4" />}
                   {showLyricsInFull ? "Close Lyrics" : "Lyrics Scroll"}
                 </Button>
                 <QueueSheet isOpen={isQueueSheetOpen} onOpenChange={(open) => !open && closeOverlays()} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const QueueSheet = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queue, currentTrack, setCurrentTrack, removeFromQueue, clearQueue } = usePlayerStore();
  const [recommendations, setRecommendations] = useState<Track[]>([]);

  useEffect(() => {
    if (currentTrack) {
        getRelatedVideos(currentTrack.id).then(setRecommendations);
    }
  }, [currentTrack]);

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sheet');
    router.push(`/?${params.toString()}`);
  };

  const openQueue = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', 'queue');
    router.push(`/?${params.toString()}`);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" onClick={openQueue} className="text-primary/60 hover:text-primary relative">
          <ListMusic className="w-5 h-5" />
          {queue.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-black border-l border-primary/20 text-primary p-0 w-full sm:max-w-md">
        <div className="h-full flex flex-col p-8 md:p-10 relative">
          <SheetClose className="absolute top-6 right-6 text-primary hover:text-white transition-colors" onClick={close}>
            <X className="w-8 h-8" />
          </SheetClose>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <SheetTitle className="text-primary font-black uppercase tracking-[0.4em] text-2xl md:text-3xl gold-glow">The Queue</SheetTitle>
            {queue.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearQueue} className="text-destructive hover:bg-destructive/10 font-black text-[10px] uppercase tracking-widest">
                <Trash2 className="w-3 h-3 mr-2" /> Clear
              </Button>
            )}
          </SheetHeader>
          
          <ScrollArea className="flex-1 pr-4 custom-scrollbar">
            <div className="space-y-10">
              {currentTrack && (
                <section>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-4">Manifesting Now</p>
                  <QueueItem track={currentTrack} isActive />
                </section>
              )}
              
              <section>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-4">Upcoming Archives</p>
                {queue.length > 0 ? (
                  <div className="space-y-4">
                    {queue.map((track, i) => (
                      <QueueItem 
                        key={`${track.id}-${i}`} 
                        track={track} 
                        onPlay={() => {
                          setCurrentTrack(track);
                          removeFromQueue(track.id);
                        }}
                        onRemove={() => removeFromQueue(track.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-primary/10 rounded-3xl bg-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/30">The queue is silent.</p>
                  </div>
                )}
              </section>

              {recommendations.length > 0 && (
                <section>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-4">The Oracle Recommends</p>
                    <div className="space-y-4">
                        {recommendations.slice(0, 5).map((track) => (
                            <QueueItem 
                                key={track.id} 
                                track={track} 
                                onPlay={() => setCurrentTrack(track)}
                            />
                        ))}
                    </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const QueueItem = ({ track, isActive = false, onPlay, onRemove }: { track: Track, isActive?: boolean, onPlay?: () => void, onRemove?: () => void }) => (
  <div className={cn(
    "flex items-center gap-4 group p-3 rounded-2xl transition-all",
    isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"
  )}>
    <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-primary/10">
      <img src={track.thumbnail} className="w-full h-full object-cover" alt={track.title} />
      {!isActive && onPlay && (
        <button onClick={onPlay} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
          <Play className="w-5 h-5 fill-primary text-primary" />
        </button>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("text-xs font-black uppercase truncate tracking-tighter", isActive ? "text-primary" : "text-white")}>{track.title}</p>
      <p className="text-[9px] font-black uppercase truncate tracking-[0.2em] text-muted-foreground">{track.artist}</p>
    </div>
    {!isActive && onRemove && (
      <Button variant="ghost" size="icon" onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 h-8 w-8">
        <X className="w-4 h-4" />
      </Button>
    )}
  </div>
);