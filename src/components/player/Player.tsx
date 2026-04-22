
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, Heart, Maximize2, Music, Loader2, Shuffle, Repeat, ListMusic } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { generateLyrics } from '@/ai/flows/generate-lyrics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export const Player: React.FC = () => {
  const { 
    currentTrack, isPlaying, setIsPlaying, nextTrack, previousTrack, 
    progress, duration, volume, setVolume, isAdPlaying, likedTrackIds, toggleLike, seekTo,
    isShuffle, toggleShuffle, repeatMode, setRepeatMode, queue
  } = usePlayerStore();
  
  const { user } = useUser();
  const db = useFirestore();
  const [isFullPlayer, setIsFullPlayer] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  useEffect(() => {
    if (currentTrack) {
      setLyrics(null);
    }
  }, [currentTrack]);

  const fetchLyrics = async () => {
    if (!currentTrack || lyrics) return;
    setIsLoadingLyrics(true);
    try {
      const result = await generateLyrics({ title: currentTrack.title, artist: currentTrack.artist });
      setLyrics(result.lyrics);
    } catch (error) {
      console.error("Failed to fetch lyrics", error);
      setLyrics("Archive error. Lyrics currently unavailable.");
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  if (!currentTrack) return null;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    const isLiked = likedTrackIds.has(currentTrack.id);
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', currentTrack.id);
    
    toggleLike(currentTrack.id);

    if (isLiked) {
      deleteDocumentNonBlocking(likeRef);
    } else {
      setDocumentNonBlocking(likeRef, { 
        id: currentTrack.id, 
        userId: user.uid, 
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnailUrl: currentTrack.thumbnail,
        durationSeconds: currentTrack.duration,
        likedAt: new Date().toISOString() 
      }, { merge: true });
    }
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
            className="fixed bottom-0 left-0 right-0 z-40 h-24 bg-black/95 border-t border-primary/20 flex items-center px-4 md:px-12 gap-6 backdrop-blur-3xl"
          >
            <div className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer" onClick={() => setIsFullPlayer(true)}>
              <div className="relative group shrink-0">
                <img src={currentTrack.thumbnail} className="w-14 h-14 rounded-2xl border border-primary/30 shadow-2xl object-cover" alt="cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-2xl">
                  <Maximize2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-primary truncate gold-glow uppercase tracking-tighter italic">{currentTrack.title}</span>
                <span className="text-[9px] text-muted-foreground truncate uppercase tracking-[0.3em] font-black">{currentTrack.artist}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLike} className="text-primary ml-2 shrink-0">
                <Heart className={cn("w-5 h-5", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-1.5 flex-[2] max-w-2xl">
              <div className="flex items-center gap-4 md:gap-8">
                <Button variant="ghost" size="icon" onClick={() => toggleShuffle()} className={cn("transition-all", isShuffle ? "text-primary" : "text-primary/30")}>
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary/60 hover:text-primary transition-all active:scale-90"><SkipBack className="w-5 h-5" /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-12 h-12 border-2 border-primary/40 rounded-full hover:bg-primary/10 transition-all bg-primary/5 active:scale-95" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="fill-primary text-primary w-5 h-5" /> : <Play className="fill-primary text-primary ml-1 w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary/60 hover:text-primary transition-all active:scale-90"><SkipForward className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" onClick={handleRepeatToggle} className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary" : "text-primary/30")}>
                  <Repeat className="w-4 h-4" />
                  {repeatMode === 'one' && <span className="absolute -top-1 right-0 text-[8px] font-black">1</span>}
                </Button>
              </div>
              <div className="flex items-center gap-4 w-full">
                <span className="text-[9px] font-mono font-bold text-primary/40 w-10 text-right">{formatTime(progress)}</span>
                <Slider value={[progress]} max={duration || 100} onValueChange={(v) => seekTo(v[0])} className="cursor-pointer flex-1 h-1" />
                <span className="text-[9px] font-mono font-bold text-primary/40 w-10">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-end gap-4">
               <Sheet>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" onClick={fetchLyrics} className="text-primary/60 hover:text-primary transition-all">
                     <Music className="w-5 h-5" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right" className="bg-black border-l border-primary/20 text-primary p-0 w-full sm:max-w-md">
                   <div className="h-full flex flex-col p-10">
                     <SheetHeader className="mb-10 text-center">
                       <SheetTitle className="text-primary font-black italic uppercase tracking-[0.4em] text-3xl gold-glow">The Scroll</SheetTitle>
                     </SheetHeader>
                     <ScrollArea className="flex-1 pr-4">
                       {isLoadingLyrics ? (
                         <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
                           <Loader2 className="w-10 h-10 animate-spin text-primary" />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Summoning Lyrics...</p>
                         </div>
                       ) : (
                         <p className="text-xl font-bold whitespace-pre-wrap leading-[2.5] tracking-wide text-center">
                           {lyrics || "Silent for now."}
                         </p>
                       )}
                     </ScrollArea>
                   </div>
                 </SheetContent>
               </Sheet>

               <Sheet>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" className="text-primary/60 hover:text-primary transition-all">
                     <ListMusic className="w-5 h-5" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent className="bg-black border-l border-primary/20 text-primary p-6">
                    <SheetHeader className="mb-8">
                      <SheetTitle className="text-primary font-black italic uppercase tracking-[0.3em]">Next in Line</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full">
                      {queue.length > 0 ? (
                        <div className="space-y-4">
                          {queue.map((t, idx) => (
                            <div key={`${t.id}-${idx}`} className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-lg group">
                              <img src={t.thumbnail} className="w-10 h-10 rounded-md object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate italic">{t.title}</p>
                                <p className="text-[10px] uppercase tracking-widest opacity-40">{t.artist}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] italic opacity-40 uppercase tracking-[0.3em] text-center mt-20">Queue Empty</p>
                      )}
                    </ScrollArea>
                 </SheetContent>
               </Sheet>

               <div className="flex items-center gap-3 w-32 ml-4">
                 <Volume2 className="w-4 h-4 text-primary/60" />
                 <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} className="h-1" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFullPlayer && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-50 bg-black flex flex-col p-6 h-[100dvh] w-screen overflow-hidden gradient-bg"
          >
            <div className="flex justify-between items-center h-16 shrink-0 px-2">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(false)} className="text-primary active:scale-90">
                <ChevronDown className="w-10 h-10" />
              </Button>
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary gold-glow italic ml-4">SANCTUARY</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleLike} className={cn("active:scale-90", likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-primary/40")}>
                  <Heart className={cn("w-8 h-8", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-around py-4 max-w-4xl mx-auto w-full overflow-hidden">
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-0">
                <div className={cn("aspect-square h-full max-h-[40dvh] md:max-h-[50dvh] rounded-[3rem] border-4 border-primary/10 overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.15)] relative group transition-all duration-700", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-1000", isAdPlaying && "blur-3xl grayscale scale-125")} alt="artwork" />
                </div>
              </div>

              <div className="space-y-8 w-full px-6 shrink-0 mt-8">
                <div className="text-center px-4">
                  <h2 className="text-2xl md:text-5xl font-black text-primary gold-glow truncate mb-3 uppercase tracking-tighter italic leading-tight">{currentTrack.title}</h2>
                  <p className="text-xs md:text-xl text-muted-foreground truncate uppercase tracking-[0.4em] font-black opacity-60">{currentTrack.artist}</p>
                </div>

                <div className="space-y-4 max-w-2xl mx-auto">
                  <Slider value={[progress]} max={duration || 100} onValueChange={(v) => seekTo(v[0])} className="cursor-pointer h-2" />
                  <div className="flex justify-between text-[11px] font-mono text-primary/40 tracking-[0.3em] font-bold">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 md:gap-16">
                  <Button variant="ghost" size="icon" onClick={() => toggleShuffle()} className={cn("transition-all", isShuffle ? "text-primary scale-125" : "text-primary/30")}>
                    <Shuffle className="w-8 h-8" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary hover:bg-primary/5 rounded-full h-16 w-16 transition-all active:scale-75"><SkipBack className="w-10 h-10" /></Button>
                  <Button 
                    variant="ghost" 
                    className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/40 rounded-full hover:bg-primary/10 bg-primary/5 shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all active:scale-90 flex items-center justify-center" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary" /> : <Play className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary ml-2" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary hover:bg-primary/5 rounded-full h-16 w-16 transition-all active:scale-75"><SkipForward className="w-10 h-10" /></Button>
                  <Button variant="ghost" size="icon" onClick={handleRepeatToggle} className={cn("transition-all relative", repeatMode !== 'none' ? "text-primary scale-125" : "text-primary/30")}>
                    <Repeat className="w-8 h-8" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
