"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getSaavnPlaybackUrl } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';

/**
 * Vibecraft Sovereign Audio Engine
 * Pure HTML5 Native Audio implementation for Saavn and Local Archives.
 */
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
      audio.preload = "auto";
      
      audio.addEventListener('timeupdate', () => {
        if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
          setProgress(audioRef.current.currentTime);
        }
      });
      
      audio.addEventListener('loadedmetadata', () => {
        if (audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audio.addEventListener('ended', () => {
        nextTrack();
      });

      audio.addEventListener('waiting', () => setIsBuffering(true));
      audio.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsPlaying(true);
      });
      
      audio.addEventListener('pause', () => {
        if (loadingId.current === currentTrack?.id) {
           setIsPlaying(false);
        }
      });

      audio.addEventListener('error', (e) => {
        if (!audio.src || audio.src === window.location.href || audio.src === "") return;
        console.warn("Sovereign Stream Interruption Detected:", audio.error?.message);
        setIsBuffering(false);
      });

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Handle Track Source Switching (Saavn + Local)
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    if (loadingId.current === currentTrack.id) return;
    
    const initializePlayback = async () => {
      loadingId.current = currentTrack.id;
      let url = "";

      try {
        if (currentTrack.isLocal && currentTrack.localFile) {
          url = URL.createObjectURL(currentTrack.localFile);
        } else if (currentTrack.isSaavn) {
          setIsBuffering(true);
          const manifestedUrl = await getSaavnPlaybackUrl(currentTrack.id);
          if (manifestedUrl) {
            url = manifestedUrl;
          } else {
            console.error("Saavn Vault returned no stream for:", currentTrack.title);
            setIsBuffering(false);
            toast({ title: "Stream Unavailable", description: "This archive could not be manifested.", variant: "destructive" });
            return;
          }
        }

        if (url && audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = url;
          audioRef.current.load();
          
          if (isPlaying) {
            audioRef.current.play().catch(error => {
              console.warn("Playback blocked by browser policy.", error);
            });
          }
        }
      } catch (error) {
        console.error("Sovereign Initialization Error:", error);
        setIsBuffering(false);
      }
    };

    initializePlayback();
  }, [currentTrack?.id]);

  // Global Sync Listeners
  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src || audioRef.current.src === window.location.href) return;
    if (isPlaying) audioRef.current.paused && audioRef.current.play().catch(() => {});
    else !audioRef.current.paused && audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (seekRequest !== null && audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = seekRequest;
    }
  }, [seekRequest]);

  return <div id="vibecraft-sovereign-audio-engine" className="hidden" />;
};
