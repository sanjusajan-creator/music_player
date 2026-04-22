
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, Heart, Maximize2, Music, Loader2 } from 'lucide-react';
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
    progress, duration, volume, setVolume, isAdPlaying, likedTrackIds, toggleLike, seekTo
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

  return (
    <>
      {/* Mini Player */}
      <AnimatePresence>
        {!isFullPlayer && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 h-24 md:h-28 bg-black/95 border-t border-primary/20 flex items-center px-4 md:px-12 gap-4 md:gap-12 backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer" onClick={() => setIsFullPlayer(true)}>
              <div className="relative group shrink-0">
                <img src={currentTrack.thumbnail} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-primary/30 shadow-2xl object-cover" alt="cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-2xl">
                  <Maximize2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm md:text-base font-black text-primary truncate gold-glow uppercase tracking-tighter italic">{currentTrack.title}</span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground truncate uppercase tracking-[0.3em] font-black">{currentTrack.artist}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 max-w-xl w-full">
              <div className="flex items-center gap-4 md:gap-12">
                <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary/60 hover:text-primary transition-all active:scale-90"><SkipBack className="w-6 h-6 md:w-7 md:h-7" /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-12 h-12 md:w-16 md:h-16 border-2 border-primary/40 rounded-full hover:bg-primary/10 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] bg-primary/5 active:scale-95" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="fill-primary text-primary w-6 h-6 md:w-7 md:h-7" /> : <Play className="fill-primary text-primary ml-1 w-6 h-6 md:w-7 md:h-7" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary/60 hover:text-primary transition-all active:scale-90"><SkipForward className="w-6 h-6 md:w-7 md:h-7" /></Button>
              </div>
              <div className="hidden md:flex items-center gap-4 w-full px-8">
                <span className="text-[9px] font-mono font-bold text-primary/40 w-10 text-right">{formatTime(progress)}</span>
                <Slider value={[progress]} max={duration || 100} onValueChange={(v) => seekTo(v[0])} className="cursor-pointer flex-1 h-1" />
                <span className="text-[9px] font-mono font-bold text-primary/40 w-10">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex-1 hidden md:flex items-center justify-end gap-6">
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
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Consulting Archive...</p>
                         </div>
                       ) : (
                         <p className="text-xl font-bold whitespace-pre-wrap leading-[2.5] tracking-wide text-center">
                           {lyrics || "Select a track to unveil its story."}
                         </p>
                       )}
                     </ScrollArea>
                   </div>
                 </SheetContent>
               </Sheet>

               <Button variant="ghost" size="icon" onClick={handleLike} className="text-primary hover:bg-primary/10 transition-all">
                 <Heart className={cn("w-6 h-6", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
               </Button>
               <div className="flex items-center gap-4 w-36">
                 <Volume2 className="w-4 h-4 text-primary/60" />
                 <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} className="h-1" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Overlay */}
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
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary gold-glow italic ml-4">Vibecraft Sanctuary</span>
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={fetchLyrics} className="text-primary active:scale-90">
                      <Music className="w-8 h-8" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85dvh] bg-black border-t border-primary/20 text-primary rounded-t-[4rem] p-0 shadow-[0_-20px_50px_rgba(212,175,55,0.1)]">
                    <div className="h-full flex flex-col p-10">
                      <SheetHeader className="mb-8">
                        <SheetTitle className="text-primary font-black italic uppercase tracking-[0.5em] text-2xl gold-glow text-center">Lyrics</SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="flex-1">
                        {isLoadingLyrics ? (
                          <div className="flex flex-col items-center justify-center py-24 gap-6">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Opening Archive...</p>
                          </div>
                        ) : (
                          <div className="text-center pb-20">
                            <p className="text-2xl md:text-3xl font-black whitespace-pre-wrap leading-[3] italic tracking-tight">
                              {lyrics || "Silent Sanctuary"}
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </SheetContent>
                </Sheet>
                <Button variant="ghost" size="icon" onClick={handleLike} className={cn("active:scale-90", likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-primary/40")}>
                  <Heart className={cn("w-8 h-8", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-around py-4 max-w-4xl mx-auto w-full overflow-hidden">
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-0">
                <div className={cn("aspect-square h-full max-h-[40dvh] md:max-h-[50dvh] rounded-[3.5rem] border-4 border-primary/10 overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.15)] relative group transition-all duration-700", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-1000", isAdPlaying && "blur-3xl grayscale scale-125")} alt="artwork" />
                  {isAdPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl p-10 text-center animate-in zoom-in-95 duration-700">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8" />
                      <p className="text-primary font-black uppercase tracking-[0.4em] text-2xl italic gold-glow">Interlude</p>
                      <p className="text-[10px] text-muted-foreground mt-4 tracking-[0.3em] font-black">RESUMING SHORTLY</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-10 w-full px-6 shrink-0 mt-8">
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

                <div className="flex items-center justify-center gap-10 md:gap-20">
                  <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary hover:bg-primary/5 rounded-full h-16 w-16 transition-all active:scale-75"><SkipBack className="w-10 h-10" /></Button>
                  <Button 
                    variant="ghost" 
                    className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/40 rounded-full hover:bg-primary/10 bg-primary/5 shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all active:scale-90 flex items-center justify-center" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary" /> : <Play className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary ml-2" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary hover:bg-primary/5 rounded-full h-16 w-16 transition-all active:scale-75"><SkipForward className="w-10 h-10" /></Button>
                </div>

                <div className="max-w-xs mx-auto flex items-center gap-6 bg-white/5 rounded-full px-8 py-4 border border-white/10 backdrop-blur-xl hidden md:flex">
                   <Volume2 className="w-5 h-5 text-primary/60" />
                   <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} className="h-1" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
