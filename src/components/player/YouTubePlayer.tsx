
"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getSaavnPlaybackUrl } from '@/app/actions/youtube-search';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    setIsPlaying, 
    setIsBuffering,
    setProgress,
    setDuration,
    nextTrack,
    seekRequest
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadingId = useRef<string | null>(null);

  // Initialize Native Audio Engine
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      
      audio.addEventListener('timeupdate', () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      
      audio.addEventListener('loadedmetadata', () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      });
      
      audio.addEventListener('ended', () => {
        nextTrack();
      });

      audio.addEventListener('waiting', () => setIsBuffering(true));
      audio.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsPlaying(true);
      });
      audio.addEventListener('pause', () => setIsPlaying(false));

      audio.addEventListener('error', () => {
        const err = audio.error;
        if (!audio.src || audio.src === window.location.href || audio.src === "" || audio.src.includes('null')) return;
        console.error("Vibecraft Sovereign Audio Error:", err?.message);
      });

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [nextTrack, setProgress, setDuration, setIsBuffering, setIsPlaying]);

  // Handle Track Source Switching (Saavn + Local)
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    
    // Prevent redundant loads
    if (loadingId.current === currentTrack.id) return;
    loadingId.current = currentTrack.id;

    const initializePlayback = async () => {
      let url = "";

      if (currentTrack.isLocal && currentTrack.localFile) {
        url = URL.createObjectURL(currentTrack.localFile);
      } else if (currentTrack.isSaavn) {
        setIsBuffering(true);
        url = await getSaavnPlaybackUrl(currentTrack.id) || "";
      }

      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        if (isPlaying) audioRef.current.play().catch(() => {});
      }
    };

    initializePlayback();
  }, [currentTrack?.id]);

  // Handle Global Play/Pause
  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src || audioRef.current.src === window.location.href) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Handle Seek
  useEffect(() => {
    if (seekRequest !== null && audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = seekRequest;
    }
  }, [seekRequest]);

  return <div id="vibecraft-sovereign-audio-engine" className="hidden" />;
};
