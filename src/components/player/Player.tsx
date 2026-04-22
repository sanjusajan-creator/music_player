
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
      {/* Sleek Desktop/Mini Player */}
      <AnimatePresence>
        {!isFullPlayer && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 h-20 md:h-24 bg-black/90 border-t border-primary/20 flex items-center px-4 md:px-8 gap-4 md:gap-8 backdrop-blur-2xl"
          >
            {/* Track Info */}
            <div className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer" onClick={() => setIsFullPlayer(true)}>
              <div className="relative group">
                <img src={currentTrack.thumbnail} className="w-12 h-12 md:w-16 md:h-16 rounded-xl border border-primary/30 shadow-lg" alt="cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl">
                  <Maximize2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm md:text-base font-black text-primary truncate gold-glow">{currentTrack.title}</span>
                <span className="text-xs md:text-sm text-muted-foreground truncate uppercase tracking-widest">{currentTrack.artist}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLike} className="hidden md:flex text-primary hover:bg-primary/10">
                <Heart className={cn("w-5 h-5", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
              </Button>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-2 max-w-md w-full">
              <div className="flex items-center gap-4 md:gap-8">
                <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary hover:text-accent"><SkipBack className="w-5 h-5 md:w-6 md:h-6" /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 md:w-14 md:h-14 border-2 border-primary rounded-full hover:bg-primary/10 transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="fill-primary text-primary w-5 h-5 md:w-6 md:h-6" /> : <Play className="fill-primary text-primary ml-1 w-5 h-5 md:w-6 md:h-6" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary hover:text-accent"><SkipForward className="w-5 h-5 md:w-6 md:h-6" /></Button>
              </div>
              <div className="hidden md:flex items-center gap-3 w-full px-4">
                <span className="text-[10px] font-mono text-primary/40">{formatTime(progress)}</span>
                <Slider value={[progress]} max={duration || 100} onValueChange={(v) => setProgress(v[0])} className="cursor-pointer" />
                <span className="text-[10px] font-mono text-primary/40">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume / Extra (Desktop) */}
            <div className="flex-1 hidden md:flex items-center justify-end gap-4">
               <ListMusic className="w-5 h-5 text-primary/60 cursor-pointer hover:text-primary transition-colors" />
               <div className="flex items-center gap-3 w-32">
                 <Volume2 className="w-4 h-4 text-primary" />
                 <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Overlay - Optimized 100vh */}
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
              <span className="text-xs font-black uppercase tracking-[0.4em] text-primary gold-glow italic">Vibecraft</span>
              <Button variant="ghost" size="icon" onClick={handleLike} className={cn(likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-muted-foreground")}>
                <Heart className={cn("w-7 h-7", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
              </Button>
            </div>

            <div className="flex-1 flex flex-col justify-around py-8">
              {/* Responsive Artwork */}
              <div className="relative w-full aspect-square max-w-[85vw] md:max-w-[400px] mx-auto">
                <div className={cn("w-full h-full rounded-[2.5rem] border-2 border-primary/30 overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.2)]", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all duration-700", isAdPlaying && "blur-2xl grayscale scale-110")} />
                  {isAdPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xl p-8 text-center animate-in zoom-in-95 duration-500">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                      <p className="text-primary font-black uppercase tracking-[0.2em] text-lg italic gold-glow">Luxury Interlude</p>
                      <p className="text-xs text-muted-foreground mt-3 tracking-widest font-medium">RESUMING SHORTLY...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info & Controls */}
              <div className="space-y-8 max-w-lg mx-auto w-full">
                <div className="text-center px-4">
                  <h2 className="text-3xl font-black text-primary gold-glow truncate mb-2 uppercase tracking-tight">{currentTrack.title}</h2>
                  <p className="text-xl text-muted-foreground truncate uppercase tracking-[0.15em] font-medium">{currentTrack.artist}</p>
                </div>

                <div className="px-2 space-y-3">
                  <Slider value={[progress]} max={duration || 100} onValueChange={(v) => setProgress(v[0])} className="cursor-pointer h-2" />
                  <div className="flex justify-between text-[11px] font-mono text-primary/50 tracking-widest">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-12">
                  <Button variant="ghost" onClick={() => previousTrack()} className="text-primary scale-125 hover:bg-primary/5 rounded-full p-4 transition-all"><SkipBack className="w-10 h-10" /></Button>
                  <Button 
                    variant="ghost" 
                    className="w-24 h-24 border-[3px] border-primary rounded-full hover:bg-primary/10 bg-primary/5 shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all active:scale-95" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-10 h-10 fill-primary" /> : <Play className="w-10 h-10 fill-primary ml-1" />}
                  </Button>
                  <Button variant="ghost" onClick={() => nextTrack()} className="text-primary scale-125 hover:bg-primary/5 rounded-full p-4 transition-all"><SkipForward className="w-10 h-10" /></Button>
                </div>

                <div className="flex items-center gap-6 bg-white/5 rounded-full px-8 py-3 border border-white/10 backdrop-blur-sm">
                   <Volume2 className="w-6 h-6 text-primary" />
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
