"use client";

import React from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface SearchResultProps {
  track: Track;
}

export const SearchResult: React.FC<SearchResultProps> = ({ track }) => {
  const { setCurrentTrack, addToQueue } = usePlayerStore();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative glass-card p-3 rounded-xl hover:bg-white/10 transition-all flex flex-col gap-3"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden">
        <img src={track.thumbnail} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={track.title} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button 
            variant="primary" 
            size="icon" 
            className="rounded-full shadow-xl"
            onClick={() => setCurrentTrack(track)}
          >
            <Play className="fill-white ml-1" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full glass"
            onClick={() => addToQueue(track)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col min-w-0">
        <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{track.title}</h4>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 glass rounded-full">
        <MoreVertical className="w-4 h-4" />
      </button>
    </motion.div>
  );
};