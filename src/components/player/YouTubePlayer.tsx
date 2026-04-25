"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';

/**
 * Vibecraft Sovereign Audio Engine
 * Pure HTML5 Native Audio implementation with Hybrid Resolution Fallback.
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
    seekRequest,
    tickSleepTimer
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Global Sleep Timer Heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      tickSleepTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickSleepTimer]);

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
      audio.addEventListener('pause', () => setIsPlaying(false));
      
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    const initializePlayback = async () => {
      // MANDATORY: Aggressively purge state before manifestation to prevent overlapping snippets
      audioRef.current!.pause();
      audioRef.current!.src = "";
      audioRef.current!.load();
      setProgress(0);
      
      if (!currentTrack) return;

      let url = "";
      let sourceLog = "Unknown Vault";

      try {
        setIsBuffering(true);
        
        if (currentTrack.source === 'local' && currentTrack.localFile) {
          url = URL.createObjectURL(currentTrack.localFile);
          sourceLog = "Local Vault";
        } else if (currentTrack.streamUrl) {
          // Unified streamUrl priority (YouTube Music, etc.)
          url = currentTrack.streamUrl;
          sourceLog = `${currentTrack.source?.toUpperCase()} Unified Stream`;
        } else {
          // Fallback resolution for Saavn/Gaana
          const resolvedUrl = await resolveTrackAudio(currentTrack);
          if (resolvedUrl) {
            url = resolvedUrl;
            sourceLog = `${currentTrack.source?.toUpperCase()} Resolved Manifestation`;
          }
        }

        if (url && audioRef.current) {
          console.log(`%cOracle: Manifesting track from ${sourceLog}`, "color: #FFD700; font-weight: 900;");
          audioRef.current.src = url;
          audioRef.current.load();
          if (isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => setIsPlaying(false));
            }
          }
        } else {
          setIsBuffering(false);
          toast({ title: "Resolution Failed", description: "Audio bitstream could not be manifested.", variant: "destructive" });
        }
      } catch (error) {
        setIsBuffering(false);
      }
    };

    initializePlayback();
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
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
