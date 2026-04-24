"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';

/**
 * Vibecraft Sovereign Audio Engine
 * Pure HTML5 Native Audio implementation with Hybrid Resolution Fallback.
 * Hardened to prevent overlap and ghost playback.
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
      
      audio.addEventListener('ended', () => nextTrack());
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
      // MANDATORY: Immediately stop and clear any existing buffer to prevent overlap
      audioRef.current!.pause();
      audioRef.current!.src = "";
      
      if (!currentTrack) return;

      let url = "";
      let sourceLog = "Unknown Vault";

      try {
        setIsBuffering(true);
        
        if (currentTrack.source === 'local' && currentTrack.localFile) {
          url = URL.createObjectURL(currentTrack.localFile);
          sourceLog = "Local Vault";
        } else if (currentTrack.source === 'youtube') {
          sourceLog = "YouTube Discovery (Iframe Mode)";
          // YouTube handled via iframe in page.tsx
          setIsBuffering(false);
          return;
        } else {
          // Resolve Gaana or Saavn
          const resolvedUrl = await resolveTrackAudio(currentTrack);
          if (resolvedUrl) {
            url = resolvedUrl;
            sourceLog = currentTrack.source === 'gaana' ? "Gaana Resolved via Saavn Vault" : "JioSaavn Vault";
          } else if (currentTrack.source === 'gaana') {
            sourceLog = "Gaana Fallback to YouTube Discovery";
            toast({ title: "Resolution Fallback", description: "Manifesting via YouTube Discovery." });
            setIsBuffering(false);
            return;
          }
        }

        if (url && audioRef.current) {
          console.log(`%cOracle: Manifesting track from ${sourceLog}`, "color: #FFD700; font-weight: 900; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);");
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
          if (currentTrack.source !== 'youtube') {
            console.error("Saavn Vault returned no stream for:", currentTrack.title);
            toast({ title: "Manifestation Failed", description: "Archive unreachable.", variant: "destructive" });
          }
        }
      } catch (error) {
        setIsBuffering(false);
      }
    };

    initializePlayback();
  }, [currentTrack?.id, setIsBuffering, setIsPlaying, isPlaying]);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src || currentTrack?.isYouTube) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.isYouTube]);

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