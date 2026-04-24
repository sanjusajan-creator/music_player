"use client";

import React, { memo } from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Heart, Music2, Youtube, Disc, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, getImage } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SearchResultProps {
  track: Track;
  results?: Track[]; // Sibling tracks for auto-queue
  index?: number;
}

export const SearchResult = memo(({ track, results = [], index = 0 }: SearchResultProps) => {
  const setQueue = usePlayerStore(s => s.setQueue);
  const addToQueue = usePlayerStore(s => s.addToQueue);
  const likedTrackIds = usePlayerStore(s => s.likedTrackIds);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  
  const { user } = useUser();
  const db = useFirestore();
  
  const isLiked = Array.isArray(likedTrackIds) ? likedTrackIds.includes(track.id) : false;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (results.length > 0) {
      setQueue(results, index);
    } else {
      setQueue([track], 0);
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
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
        thumbnailUrl: getImage(track),
        durationSeconds: track.duration || 0,
        likedAt: new Date().toISOString() 
      }, { merge: true });
    }
  };

  const getSourceLabel = () => {
    if (track.source === 'jiosaavn') return "JioSaavn";
    if (track.source === 'gaana') return "Gaana (Vercel)";
    if (track.source === 'youtube') return "YouTube";
    return "Local";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative h-full flex flex-col bg-[#000000] hover:bg-[#111111] transition-all rounded-xl border border-primary/10 hover:border-primary/40 p-4 cursor-pointer"
      onClick={handlePlay}
    >
      <div className="relative aspect-square mb-4 shadow-2xl rounded-lg overflow-hidden shrink-0">
        <img src={getImage(track)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.title} loading="lazy" />
        
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {track.isYouTube && (
            <div className="bg-black/80 p-1.5 rounded-full border border-primary/20">
              <Youtube className="w-4 h-4 text-primary" />
            </div>
          )}
          {track.isGaana && (
             <div className="bg-black/80 p-1.5 rounded-full border border-primary/20">
               <Disc className="w-4 h-4 text-primary" />
             </div>
          )}
          <div className="bg-black/80 px-2 py-0.5 rounded-full border border-primary/40 flex items-center gap-1">
            <span className="text-[7px] font-black text-primary uppercase tracking-widest">🇮🇳 INDIA</span>
          </div>
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 right-2 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-all"
            onClick={handleAddToQueue}
          >
            <Plus className="text-white w-5 h-5" />
          </button>
          <button 
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-90"
            onClick={handlePlay}
          >
            <Play className="fill-black text-black w-6 h-6 ml-1" />
          </button>
        </div>
      </div>
      
      <div className="space-y-1 min-w-0 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-black text-sm text-primary truncate uppercase tracking-tighter leading-none gold-glow flex-1">{track.title}</h4>
          <span className="text-[8px] font-black text-primary/40 border border-primary/10 px-1 rounded uppercase tracking-widest">{getSourceLabel()}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <p className="text-[10px] text-primary/40 uppercase tracking-widest truncate font-black flex-1">{track.artist}</p>
          <button onClick={handleLike} className="shrink-0 p-1 transition-all active:scale-125">
            <Heart className={cn("w-4 h-4 transition-all", isLiked ? "fill-primary text-primary" : "text-primary/20 opacity-0 group-hover:opacity-100 hover:text-primary")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

SearchResult.displayName = 'SearchResult';
