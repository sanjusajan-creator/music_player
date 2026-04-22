"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, Heart, Maximize2 } from 'lucide-react';
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

  const handleLike = () => {
    if (!user || !db) return;
    const isLiked = likedTrackIds.has(currentTrack.id);
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', currentTrack.id);
    
    if (isLiked) {
      deleteDoc(likeRef);
    } else {
      setDoc(likeRef, { 
        id: currentTrack.id, 
        userId: user.uid, 
        likedAt: new Date().toISOString() 
      });
    }
    toggleLike(currentTrack.id);
  };

  const formatTime = (s: number) => {
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
            className="fixed bottom-0 left-0 right-0 z-40 h-20 bg-black/95 border-t border-primary/20 flex items-center px-4 gap-4 backdrop-blur-lg"
          >
            <div className="flex-1 flex items-center gap-3 min-w-0" onClick={() => setIsFullPlayer(true)}>
              <img src={currentTrack.thumbnail} className="w-12 h-12 rounded border border-primary/30" alt="cover" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-primary truncate">{currentTrack.title}</span>
                <span className="text-xs text-muted-foreground truncate">{currentTrack.artist}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="text-primary hover:text-accent"><SkipBack /></Button>
              <Button variant="ghost" size="icon" className="w-12 h-12 border-2 border-primary rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="fill-primary text-primary" /> : <Play className="fill-primary text-primary ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => nextTrack()} className="text-primary hover:text-accent"><SkipForward /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Overlay - Mobile Optimized 100vh */}
      <AnimatePresence>
        {isFullPlayer && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-50 bg-black flex flex-col p-6 h-[100dvh] w-screen overflow-hidden"
          >
            <div className="flex justify-between items-center h-12">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(false)} className="text-primary">
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-primary gold-glow">Vibecraft</span>
              <Button variant="ghost" size="icon" onClick={handleLike} className={cn(likedTrackIds.has(currentTrack.id) ? "text-primary" : "text-muted-foreground")}>
                <Heart className={cn("w-6 h-6", likedTrackIds.has(currentTrack.id) && "fill-primary")} />
              </Button>
            </div>

            <div className="flex-1 flex flex-col justify-around py-4">
              {/* Responsive Artwork */}
              <div className="relative w-full aspect-square max-w-[80vw] mx-auto">
                <div className={cn("w-full h-full rounded-2xl border-2 border-primary/40 overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)]", isAdPlaying && "animate-pulse-gold")}>
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover transition-all", isAdPlaying && "blur-2xl grayscale")} />
                  {isAdPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-6 text-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-primary font-bold uppercase tracking-widest text-sm">Luxury Break</p>
                      <p className="text-xs text-muted-foreground mt-2">Resume in moments...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info & Controls */}
              <div className="space-y-6">
                <div className="text-center px-4">
                  <h2 className="text-2xl font-black text-primary gold-glow truncate mb-1">{currentTrack.title}</h2>
                  <p className="text-lg text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>

                <div className="px-2 space-y-2">
                  <Slider value={[progress]} max={duration || 100} onValueChange={(v) => setProgress(v[0])} className="cursor-pointer" />
                  <div className="flex justify-between text-[10px] font-mono text-primary/60">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-10">
                  <Button variant="ghost" onClick={() => previousTrack()} className="text-primary"><SkipBack className="w-10 h-10" /></Button>
                  <Button variant="ghost" className="w-20 h-20 border-4 border-primary rounded-full hover:bg-primary/10" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="w-10 h-10 fill-primary" /> : <Play className="w-10 h-10 fill-primary ml-1" />}
                  </Button>
                  <Button variant="ghost" onClick={() => nextTrack()} className="text-primary"><SkipForward className="w-10 h-10" /></Button>
                </div>

                <div className="flex items-center gap-4 bg-primary/5 rounded-full px-6 py-2 border border-primary/20">
                   <Volume2 className="w-5 h-5 text-primary" />
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