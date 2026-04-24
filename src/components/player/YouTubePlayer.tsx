
"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getSaavnPlaybackUrl } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';

/**
 * Vibecraft Sovereign Audio Engine
 * Pure HTML5 Native Audio implementation for Saavn High-Fidelity streams.
 */
export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    settings,
    setIsPlaying, 
    setIsBuffering,
    setProgress,
    setDuration,
    nextTrack,
    seekRequest
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadingId = useRef<string | null>(null);

  // Initialize Persistent Native Audio Engine
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
        console.warn("Sovereign Stream Interruption:", audio.error?.message);
        setIsBuffering(false);
        if (audio.error?.code === 4) {
          toast({ title: "Stream Unavailable", description: "Skipping to next archive...", variant: "destructive" });
          setTimeout(() => nextTrack(), 2000);
        }
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
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  // Handle Manifestation Switching
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    
    // We re-load if quality setting changes for Saavn tracks
    const initializePlayback = async () => {
      loadingId.current = currentTrack.id;
      let url = "";

      try {
        if (currentTrack.isLocal && currentTrack.localFile) {
          url = URL.createObjectURL(currentTrack.localFile);
        } else if (currentTrack.isSaavn) {
          setIsBuffering(true);
          const quality = settings.dataSaver ? 'low' : settings.audioQuality;
          const manifestedUrl = await getSaavnPlaybackUrl(currentTrack.id, quality);
          if (manifestedUrl) {
            url = manifestedUrl;
          } else {
            console.error("Saavn Vault returned no stream for:", currentTrack.title);
            setIsBuffering(false);
            toast({ title: "Stream Unavailable", description: "This archive could not be manifested.", variant: "destructive" });
            return;
          }
        } else if (currentTrack.isYouTube) {
          // If the engine falls back to YouTube, we'd normally use an Iframe,
          // but for unified native audio, we'd need a third party scraper or proxy.
          // For now, we simulate Saavn native only.
          toast({ title: "YouTube discovery", description: "Native audio fallback coming soon." });
          return;
        }

        if (url && audioRef.current) {
          const currentTime = audioRef.current.currentTime;
          const wasPlaying = !audioRef.current.paused;
          
          audioRef.current.pause();
          audioRef.current.src = url;
          audioRef.current.load();
          
          if (wasPlaying || isPlaying) {
            audioRef.current.play().catch(error => {
              console.warn("Playback blocked by browser policy. Interaction required.", error);
              setIsPlaying(false);
            });
          }
        }
      } catch (error) {
        console.error("Sovereign Initialization Error:", error);
        setIsBuffering(false);
      }
    };

    initializePlayback();
  }, [currentTrack?.id, settings.audioQuality, settings.dataSaver]);

  // Sync Global Play/Pause
  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src || audioRef.current.src === window.location.href) return;
    if (isPlaying) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => {});
    } else {
      if (!audioRef.current.paused) audioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync Global Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Sync Global Seek Requests
  useEffect(() => {
    if (seekRequest !== null && audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = seekRequest;
    }
  }, [seekRequest]);

  return <div id="vibecraft-sovereign-audio-engine" className="hidden" />;
};
