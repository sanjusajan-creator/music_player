"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getSaavnPlaybackUrl } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';

/**
 * Vibecraft Sovereign Audio Engine
 * Pure HTML5 Native Audio implementation with Hybrid Fallback Diagnostics.
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
    if (!currentTrack || !audioRef.current) return;
    
    const initializePlayback = async () => {
      let url = "";
      let source = "Unknown Vault";

      try {
        if (currentTrack.isLocal && currentTrack.localFile) {
          url = URL.createObjectURL(currentTrack.localFile);
          source = "Local Vault";
        } else if (currentTrack.isSaavn) {
          setIsBuffering(true);
          source = "JioSaavn Vault";
          const manifestedUrl = await getSaavnPlaybackUrl(currentTrack.id);
          if (manifestedUrl) {
            url = manifestedUrl;
          } else {
            setIsBuffering(false);
            toast({ title: "Manifestation Failed", description: "Stream unreachable in Saavn Vault.", variant: "destructive" });
            return;
          }
        } else if (currentTrack.isYouTube) {
          source = "YouTube Discovery";
          audioRef.current.pause();
          audioRef.current.src = "";
          // YouTube handled via Iframe in page.tsx
        }

        if (url && audioRef.current) {
          console.log(`%cOracle: Manifesting track from ${source}`, "color: #FFD700; font-weight: 900; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);");
          audioRef.current.pause();
          audioRef.current.src = url;
          audioRef.current.load();
          if (isPlaying) {
            audioRef.current.play().catch(() => setIsPlaying(false));
          }
        }
      } catch (error) {
        setIsBuffering(false);
      }
    };

    initializePlayback();
  }, [currentTrack?.id]);

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
