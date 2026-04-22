"use client";

import React from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SearchResultProps {
  track: Track;
}

export const SearchResult: React.FC<SearchResultProps> = ({ track }) => {
  const { setCurrentTrack, addToQueue, likedTrackIds, toggleLike } = usePlayerStore();
  const isLiked = likedTrackIds.has(track.id);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-primary/5 p-3 rounded-2xl border border-primary/10 hover:border-primary/40 transition-all flex flex-col gap-3"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden border border-primary/5">
        <img src={track.thumbnail} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={track.title} />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button 
            variant="ghost" size="icon" className="w-12 h-12 bg-primary text-black rounded-full hover:bg-accent"
            onClick={() => setCurrentTrack(track)}
          >
            <Play className="fill-black ml-1" />
          </Button>
          <Button 
            variant="ghost" size="icon" className="w-10 h-10 border border-primary/50 text-primary rounded-full hover:bg-primary/10"
            onClick={() => addToQueue(track)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col min-w-0 pr-8">
        <h4 className="font-bold text-sm text-primary truncate leading-tight mb-1">{track.title}</h4>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{track.artist}</p>
      </div>

      <button 
        onClick={() => toggleLike(track.id)}
        className={cn(
          "absolute bottom-4 right-4 p-2 transition-all group-hover:opacity-100 opacity-60",
          isLiked ? "text-primary opacity-100" : "text-primary/40"
        )}
      >
        <Heart className={cn("w-5 h-5", isLiked && "fill-primary")} />
      </button>
    </motion.div>
  );
};