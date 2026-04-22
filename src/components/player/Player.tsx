
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, Heart, Maximize2, ListMusic } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export const Player: React.FC = () => {
  const { 
    currentTrack, isPlaying, setIsPlaying, nextTrack, previousTrack, 
    progress, duration, setProgress, volume, setVolume, isAdPlaying, likedTrackIds, toggleLike
  } = usePlayerStore();
  
  const { user } = useUser();
  const db = useFirestore();
  const [isFullPlayer, setIsFullPlayer] = useState(false);

  if (!currentTrack) return null;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    const isLiked = likedTrackIds.has(currentTrack.id);
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', currentTrack.id);
    
    if (isLiked) {
      deleteDoc(likeRef);
    } else {
      setDoc(likeRef, { 
        id: currentTrack.id, 
        userId: user.uid, 
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnailUrl: currentTrack.thumbnail,
        durationSeconds: currentTrack.duration,
        likedAt: new Date().toISOString() 
      });
    }
    toggleLike(currentTrack.id);
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
                <Slider value={[progress]} max={duration || 100} onValueChange={(v) => setProgress(v[0])} className="cursor-pointer" />
                <span className="text-[9px] font-mono text-primary/40">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex-1 hidden md:flex items-center justify-end gap-6">
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
            <div className="flex justify-between items-center h-12">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(false)} className="text-primary">
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary gold-glow italic">Vibecraft Sanctuary</span>
              <Button variant="ghost" size="icon" onClick={handleLike} className={cn(likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-primary/40")}>
                <Heart className={cn("w-7 h-7", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
              </Button>
            </div>

            <div className="flex-1 flex flex-col justify-around py-8 max-w-4xl mx-auto w-full">
              <div className="relative w-full aspect-square max-w-[85vw] md:max-w-[450px] mx-auto">
                <div className={cn("w-full h-full rounded-[3rem] border-2 border-primary/20 overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.15)]", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-1000", isAdPlaying && "blur-3xl grayscale scale-125")} alt="artwork" />
                  {isAdPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl p-8 text-center animate-in zoom-in-95 duration-500">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-8" />
                      <p className="text-primary font-black uppercase tracking-[0.3em] text-xl italic gold-glow">Luxury Interlude</p>
                      <p className="text-[10px] text-muted-foreground mt-4 tracking-[0.2em] font-bold">RESUMING SHORTLY</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-10 w-full px-4">
                <div className="text-center">
                  <h2 className="text-3xl md:text-5xl font-black text-primary gold-glow truncate mb-3 uppercase tracking-tighter italic">{currentTrack.title}</h2>
                  <p className="text-lg md:text-xl text-muted-foreground truncate uppercase tracking-[0.3em] font-black">{currentTrack.artist}</p>
                </div>

                <div className="space-y-4">
                  <Slider value={[progress]} max={duration || 100} onValueChange={(v) => setProgress(v[0])} className="cursor-pointer h-1.5" />
                  <div className="flex justify-between text-[10px] font-mono text-primary/40 tracking-[0.2em] font-bold">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-10 md:gap-20">
                  <Button variant="ghost" onClick={() => previousTrack()} className="text-primary hover:bg-primary/5 rounded-full p-6 transition-all scale-110"><SkipBack className="w-10 h-10" /></Button>
                  <Button 
                    variant="ghost" 
                    className="w-24 h-24 md:w-32 md:h-32 border-[3px] border-primary/40 rounded-full hover:bg-primary/10 bg-primary/5 shadow-[0_0_40px_rgba(212,175,55,0.2)] transition-all active:scale-95 flex items-center justify-center" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary" /> : <Play className="w-10 h-10 md:w-14 md:h-14 fill-primary text-primary ml-1.5" />}
                  </Button>
                  <Button variant="ghost" onClick={() => nextTrack()} className="text-primary hover:bg-primary/5 rounded-full p-6 transition-all scale-110"><SkipForward className="w-10 h-10" /></Button>
                </div>

                <div className="max-w-md mx-auto flex items-center gap-6 bg-white/5 rounded-full px-8 py-4 border border-white/10 backdrop-blur-md">
                   <Volume2 className="w-5 h-5 text-primary/60" />
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
