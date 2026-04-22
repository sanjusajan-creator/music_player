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
            className="fixed bottom-0 left-0 right-0 z-40 h-20 md:h-24 bg-black/95 border-t border-primary/20 flex items-center px-4 md:px-8 gap-4 md:gap-8 backdrop-blur-3xl"
          >
            <div className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer" onClick={() => setIsFullPlayer(true)}>
              <div className="relative group shrink-0">
                <img src={currentTrack.thumbnail} className="w-12 h-12 md:w-16 md:h-16 rounded-xl border border-primary/30 shadow-lg object-cover" alt="cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl">
                  <Maximize2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm md:text-base font-black text-primary truncate gold-glow uppercase tracking-tighter">{currentTrack.title}</span>
                <span className="text-[10px] md:text-xs text-muted-foreground truncate uppercase tracking-[0.2em] font-bold">{currentTrack.artist}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 max-w-md w-full">
              <div className="flex items-center gap-4 md:gap-10">
                <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary/60 hover:text-primary transition-all"><SkipBack className="w-5 h-5 md:w-6 md:h-6" /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 md:w-14 md:h-14 border-2 border-primary/40 rounded-full hover:bg-primary/10 transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)]" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="fill-primary text-primary w-5 h-5 md:w-6 md:h-6" /> : <Play className="fill-primary text-primary ml-1 w-5 h-5 md:w-6 md:h-6" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary/60 hover:text-primary transition-all"><SkipForward className="w-5 h-5 md:w-6 md:h-6" /></Button>
              </div>
              <div className="hidden md:flex items-center gap-3 w-full px-4">
                <span className="text-[9px] font-mono text-primary/40">{formatTime(progress)}</span>
                <Slider value={[progress]} max={duration || 100} onValueChange={(v) => seekTo(v[0])} className="cursor-pointer" />
                <span className="text-[9px] font-mono text-primary/40">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex-1 hidden md:flex items-center justify-end gap-4">
               <Sheet>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" onClick={fetchLyrics} className="text-primary/60 hover:text-primary">
                     <Music className="w-5 h-5" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right" className="bg-black border-l border-primary/20 text-primary p-0 w-full sm:max-w-md">
                   <div className="h-full flex flex-col p-8">
                     <SheetHeader className="mb-8">
                       <SheetTitle className="text-primary font-black italic uppercase tracking-widest text-2xl gold-glow">Lyrics</SheetTitle>
                     </SheetHeader>
                     <ScrollArea className="flex-1 pr-4">
                       {isLoadingLyrics ? (
                         <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                           <Loader2 className="w-8 h-8 animate-spin" />
                           <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Decrypting Archive...</p>
                         </div>
                       ) : (
                         <p className="text-lg font-bold whitespace-pre-wrap leading-relaxed tracking-wide">
                           {lyrics || "Select a track to view lyrics."}
                         </p>
                       )}
                     </ScrollArea>
                   </div>
                 </SheetContent>
               </Sheet>

               <Button variant="ghost" size="icon" onClick={handleLike} className="text-primary hover:bg-primary/10 transition-all">
                 <Heart className={cn("w-5 h-5", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
               </Button>
               <div className="flex items-center gap-3 w-32">
                 <Volume2 className="w-4 h-4 text-primary/60" />
                 <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
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
            <div className="flex justify-between items-center h-12 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(false)} className="text-primary">
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary gold-glow italic">Vibecraft Sanctuary</span>
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={fetchLyrics} className="text-primary">
                      <Music className="w-6 h-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80dvh] bg-black border-t border-primary/20 text-primary rounded-t-[3rem] p-0">
                    <div className="h-full flex flex-col p-8">
                      <SheetHeader className="mb-6">
                        <SheetTitle className="text-primary font-black italic uppercase tracking-widest text-xl gold-glow text-center">Lyrics</SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="flex-1">
                        {isLoadingLyrics ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Opening Scroll...</p>
                          </div>
                        ) : (
                          <div className="text-center pb-12">
                            <p className="text-xl md:text-2xl font-black whitespace-pre-wrap leading-loose italic">
                              {lyrics}
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </SheetContent>
                </Sheet>
                <Button variant="ghost" size="icon" onClick={handleLike} className={cn(likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-primary/40")}>
                  <Heart className={cn("w-7 h-7", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between py-6 max-w-4xl mx-auto w-full overflow-hidden">
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-0">
                <div className={cn("aspect-square h-full max-h-[45dvh] rounded-[2.5rem] border-2 border-primary/20 overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.1)] relative", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-1000", isAdPlaying && "blur-3xl grayscale scale-125")} alt="artwork" />
                  {isAdPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl p-8 text-center animate-in zoom-in-95 duration-500">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                      <p className="text-primary font-black uppercase tracking-[0.3em] text-lg italic gold-glow">Luxury Interlude</p>
                      <p className="text-[9px] text-muted-foreground mt-3 tracking-[0.2em] font-bold">RESUMING SHORTLY</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 w-full px-4 shrink-0 mt-4">
                <div className="text-center">
                  <h2 className="text-xl md:text-3xl font-black text-primary gold-glow truncate mb-1 uppercase tracking-tighter italic">{currentTrack.title}</h2>
                  <p className="text-xs md:text-base text-muted-foreground truncate uppercase tracking-[0.3em] font-black">{currentTrack.artist}</p>
                </div>

                <div className="space-y-2">
                  <Slider value={[progress]} max={duration || 100} onValueChange={(v) => seekTo(v[0])} className="cursor-pointer h-1.5" />
                  <div className="flex justify-between text-[10px] font-mono text-primary/40 tracking-[0.2em] font-bold">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-12">
                  <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary hover:bg-primary/5 rounded-full h-14 w-14 transition-all"><SkipBack className="w-8 h-8" /></Button>
                  <Button 
                    variant="ghost" 
                    className="w-20 h-20 md:w-24 md:h-24 border-2 border-primary/40 rounded-full hover:bg-primary/10 bg-primary/5 shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all active:scale-95 flex items-center justify-center" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-primary text-primary" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-primary text-primary ml-1" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary hover:bg-primary/5 rounded-full h-14 w-14 transition-all"><SkipForward className="w-8 h-8" /></Button>
                </div>

                <div className="max-w-xs mx-auto flex items-center gap-4 bg-white/5 rounded-full px-6 py-3 border border-white/10 backdrop-blur-md hidden md:flex">
                   <Volume2 className="w-4 h-4 text-primary/60" />
                   <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
