"use client";

import React, { memo } from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SearchResultProps {
  track: Track;
}

export const SearchResult = memo(({ track }: SearchResultProps) => {
  const setCurrentTrack = usePlayerStore(s => s.setCurrentTrack);
  const likedTrackIds = usePlayerStore(s => s.likedTrackIds);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  
  const { user } = useUser();
  const db = useFirestore();
  
  const isLiked = Array.isArray(likedTrackIds) ? likedTrackIds.includes(track.id) : false;

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="spotify-card group relative"
      onClick={() => setCurrentTrack(track)}
    >
      <div className="relative aspect-square mb-4 shadow-2xl rounded-lg overflow-hidden">
        <img src={track.thumbnail} className="w-full h-full object-cover" alt={track.title} loading="lazy" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Play Button Overlay (Spotify Style) */}
        <button 
          className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
          onClick={(e) => { e.stopPropagation(); setCurrentTrack(track); }}
        >
          <Play className="fill-black text-black w-6 h-6 ml-1" />
        </button>
      </div>
      
      <div className="space-y-1 min-w-0">
        <h4 className="font-black text-sm text-white truncate uppercase tracking-tighter leading-none">{track.title}</h4>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate font-black flex-1">{track.artist}</p>
          <button onClick={handleLike} className="shrink-0">
            <Heart className={cn("w-4 h-4 transition-all", isLiked ? "fill-primary text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-white")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

SearchResult.displayName = 'SearchResult';