"use client";

import React, { memo } from 'react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { Play, Heart, Youtube, Disc, Headphones, ListMusic, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, getImage } from '@/lib/utils';
import { useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SearchResultProps {
  track: Track;
  results?: Track[]; 
  index?: number;
}

export const SearchResult = memo(({ track, results = [], index = 0 }: SearchResultProps) => {
  const setQueue = usePlayerStore(s => s.setQueue);
  const addToQueue = usePlayerStore(s => s.addToQueue);
  const likedTrackIds = usePlayerStore(s => s.likedTrackIds);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const layoutMode = usePlayerStore(s => s.settings.layoutMode);
  
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
    if (track.source === 'jiosaavn') return "Saavn";
    if (track.source === 'gaana') return "Gaana";
    if (track.source === 'youtube') return "YT";
    return "Local";
  };

  const getSourceIcon = () => {
    if (track.source === 'youtube') return <Youtube className="w-3 h-3" />;
    if (track.source === 'gaana') return <Disc className="w-3 h-3" />;
    return <Headphones className="w-3 h-3" />;
  };

  if (layoutMode === 'grid') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="group relative flex flex-col bg-[#000000] hover:bg-white/5 transition-all rounded-xl border border-primary/10 p-3 md:p-4 cursor-pointer"
        onClick={handlePlay}
      >
        <div className="relative aspect-square mb-3 shadow-2xl rounded-lg overflow-hidden shrink-0">
          <img src={getImage(track)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.title} loading="lazy" />
          <div className="absolute top-1.5 left-1.5 z-10">
            <div className="bg-black/80 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
              {getSourceIcon()}
              <span className="text-[7px] font-black text-primary uppercase tracking-widest">{getSourceLabel()}</span>
            </div>
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all">
              <Play className="fill-black text-black w-6 h-6 ml-1" />
            </button>
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="font-black text-xs md:text-sm text-primary uppercase tracking-tighter leading-tight gold-glow line-clamp-2 break-words" title={track.title}>
            {track.title}
          </h4>
          <p className="text-[9px] md:text-[10px] text-primary/40 uppercase tracking-widest truncate font-black">
            {track.artist}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative flex items-center gap-4 p-3 md:p-4 bg-[#000000] hover:bg-white/5 transition-all rounded-2xl border border-primary/5 hover:border-primary/20 cursor-pointer w-full"
      onClick={handlePlay}
    >
      <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-lg overflow-hidden shadow-xl">
        <img src={getImage(track)} className="w-full h-full object-cover" alt="art" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="fill-primary text-primary w-6 h-6" />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h4 className="font-black text-sm md:text-base text-primary uppercase tracking-tighter leading-snug gold-glow line-clamp-2 md:line-clamp-3 break-words pr-4" title={track.title}>
          {track.title}
        </h4>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 px-1.5 py-0.5 rounded border border-primary/10 flex items-center gap-1">
            {getSourceIcon()}
            <span className="text-[7px] font-black text-primary uppercase">{getSourceLabel()}</span>
          </div>
          <p className="text-[10px] md:text-xs text-primary/40 uppercase tracking-widest truncate font-black">
            {track.artist}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleLike} className="p-2 transition-all active:scale-125">
          <Heart className={cn("w-5 h-5 transition-all", isLiked ? "fill-primary text-primary" : "text-primary/20 opacity-0 group-hover:opacity-100")} />
        </button>
        <button onClick={handleAddToQueue} className="p-2 opacity-0 group-hover:opacity-100 text-primary/40 hover:text-primary transition-all">
          <ListMusic className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
});

SearchResult.displayName = 'SearchResult';
