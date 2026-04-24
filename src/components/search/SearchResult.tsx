"use client";

import React, { memo } from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SearchResultProps {
  track: Track;
}

/**
 * Optimized SearchResult with memoization and reactive heart icon.
 */
export const SearchResult = memo(({ track }: SearchResultProps) => {
  const setCurrentTrack = usePlayerStore(s => s.setCurrentTrack);
  const addToQueue = usePlayerStore(s => s.addToQueue);
  const likedTrackIds = usePlayerStore(s => s.likedTrackIds);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  
  const { user } = useUser();
  const db = useFirestore();
  
  // Use .includes() for array-based persistence
  const isLiked = Array.isArray(likedTrackIds) && likedTrackIds.includes(track.id);

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    toast({
        title: "Added to Queue",
        description: `Archive: ${track.title}`
    });
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTrack(track);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    
    const likeRef = doc(db, 'users', user.uid, 'likedSongs', track.id);
    toggleLike(track.id);
    
    if (isLiked) {
      deleteDocumentNonBlocking(likeRef);
    } else {
      setDocumentNonBlocking(likeRef, { 
        id: track.id, 
        userId: user.uid, 
        title: track.title,
        artist: track.artist,
        thumbnailUrl: track.thumbnail,
        durationSeconds: track.duration || 0,
        likedAt: new Date().toISOString() 
      }, { merge: true });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-primary/5 p-3 rounded-2xl border border-primary/10 hover:border-primary/40 transition-all flex flex-col gap-3"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden border border-primary/5">
        <img 
          src={track.thumbnail} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
          alt={track.title} 
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button 
            variant="ghost" size="icon" className="w-12 h-12 bg-primary text-black rounded-full hover:bg-white"
            onClick={handlePlay}
          >
            <Play className="fill-black ml-1" />
          </Button>
          <Button 
            variant="ghost" size="icon" className="w-10 h-10 border border-primary/50 text-primary rounded-full hover:bg-primary/10"
            onClick={handleAddToQueue}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col min-w-0 pr-8">
        <h4 className="font-black text-sm text-primary truncate leading-tight mb-1 uppercase tracking-tighter">{track.title}</h4>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate font-black">{track.artist}</p>
      </div>

      <button 
        onClick={handleLike}
        className={cn(
          "absolute bottom-4 right-4 p-2 transition-all group-hover:opacity-100 opacity-60",
          isLiked ? "text-primary opacity-100" : "text-primary/40"
        )}
      >
        <Heart className={cn("w-5 h-5", isLiked && "fill-primary")} />
      </button>
    </motion.div>
  );
});

SearchResult.displayName = 'SearchResult';