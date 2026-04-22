"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Player: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    nextTrack, 
    previousTrack, 
    progress, 
    duration,
    setProgress,
    volume,
    setVolume,
    isAdPlaying,
    queue
  } = usePlayerStore();

  const [isFullPlayer, setIsFullPlayer] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Mini Player */}
      <AnimatePresence>
        {!isFullPlayer && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-40 h-16 glass rounded-xl flex items-center px-4 gap-4 shadow-2xl"
          >
            <div 
              className="flex-1 flex items-center gap-3 cursor-pointer"
              onClick={() => setIsFullPlayer(true)}
            >
              <img src={currentTrack.thumbnail} className="w-10 h-10 rounded-md object-cover" alt={currentTrack.title} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{currentTrack.title}</span>
                <span className="text-xs text-muted-foreground truncate">{currentTrack.artist}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => previousTrack()} className="hidden md:flex">
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="icon" className="rounded-full w-10 h-10" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="fill-foreground" /> : <Play className="fill-foreground ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => nextTrack()}>
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            <div className="hidden md:flex items-center gap-3 w-40">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
            </div>
            
            <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(true)}>
              <Maximize2 className="w-4 h-4" />
            </Button>

            {/* Progress Bar Mini */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 rounded-t-xl overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-linear" 
                style={{ width: `${(progress / duration) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Overlay */}
      <AnimatePresence>
        {isFullPlayer && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 gradient-bg flex flex-col p-6 overflow-y-auto no-scrollbar"
          >
            {/* Background Blur Artwork */}
            <div className="absolute inset-0 -z-10 opacity-30 blur-[100px] saturate-150">
              <img src={currentTrack.thumbnail} className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-between items-center mb-8">
              <Button variant="ghost" size="icon" onClick={() => setIsFullPlayer(false)} className="rounded-full glass">
                <ChevronDown className="w-6 h-6" />
              </Button>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Now Playing</span>
              <Button variant="ghost" size="icon" className="rounded-full glass">
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 max-w-6xl mx-auto w-full">
              {/* Main Artwork / Ad Loading State */}
              <div className="relative group w-full max-w-md aspect-square">
                <motion.div 
                  className={cn(
                    "w-full h-full rounded-2xl shadow-2xl overflow-hidden relative",
                    isAdPlaying && "animate-pulse-slow"
                  )}
                  layoutId="artwork"
                >
                  <img src={currentTrack.thumbnail} className={cn("w-full h-full object-cover", isAdPlaying && "blur-xl")} />
                  
                  {isAdPlaying && (
                    <div className="absolute inset-0 glass flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      <h3 className="text-xl font-bold mb-2">Preparing your track...</h3>
                      <p className="text-sm text-muted-foreground">Up next: {queue[0]?.title || 'A great song'}</p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Controls Section */}
              <div className="w-full max-w-lg flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl font-bold mb-1 leading-tight">{currentTrack.title}</h2>
                  <p className="text-xl text-primary font-medium">{currentTrack.artist}</p>
                </div>

                <div className="space-y-4">
                  <Slider 
                    value={[progress]} 
                    max={duration || 100} 
                    onValueChange={(v) => setProgress(v[0])}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" className="text-muted-foreground"><Shuffle className="w-5 h-5" /></Button>
                  <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="w-12 h-12" onClick={() => previousTrack()}><SkipBack className="w-8 h-8 fill-foreground" /></Button>
                    <Button variant="primary" size="icon" className="w-20 h-20 rounded-full shadow-lg shadow-primary/20" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="w-10 h-10 fill-white" /> : <Play className="w-10 h-10 fill-white ml-1" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="w-12 h-12" onClick={() => nextTrack()}><SkipForward className="w-8 h-8 fill-foreground" /></Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground"><Repeat className="w-5 h-5" /></Button>
                </div>

                <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 glass">
                   <Volume2 className="w-5 h-5 text-muted-foreground" />
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