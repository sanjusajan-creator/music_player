"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export const YouTubePlayer: React.FC = () => {
  const searchParams = useSearchParams();
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
    tickSleepTimer,
    settings
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isFullPlayer = searchParams.get('view') === 'full';

  // Global Sleep Timer Heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      tickSleepTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickSleepTimer]);

  // Audio Engine Initialization
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
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
        console.log("%cOracle: Manifestation ended. Summoning next track...", "color: #FFD700;");
        nextTrack();
      });
      
      audio.addEventListener('waiting', () => setIsBuffering(true));
      audio.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsPlaying(true);
      });

      audio.addEventListener('error', (e) => {
        const err = audioRef.current?.error;
        // Ignore Code 4 (Empty Source) errors as they are often transitionary or harmless initial states
        if (err?.code === 4) return;
        
        console.error(`%cOracle: Audio engine failure. Code: ${err?.code} | Message: ${err?.message} | URL: ${audioRef.current?.src}`, "color: #FF0000; font-weight: bold;");
        setIsBuffering(false);
      });
      
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  // Sovereign Manifestation Pipeline
  useEffect(() => {
    const initializePlayback = async () => {
      if (!currentTrack) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
        return;
      }

      const isYT = currentTrack.isYouTube || currentTrack.source === 'youtube' || currentTrack.id.length === 11;

      if (isYT && settings.isVideoVisible) {
        // Video Sanctuary Priority
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        console.log(`%cOracle: Manifesting YouTube Video Sanctuary for "${currentTrack.title}"`, "color: #FFD700; font-weight: 900;");
      } else {
        // Native Audio Manifestation
        if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
        
        let url = "";
        try {
          setIsBuffering(true);
          
          if (currentTrack.source === 'local' && currentTrack.localFile) {
            url = URL.createObjectURL(currentTrack.localFile);
          } else {
            const resolvedUrl = await resolveTrackAudio(currentTrack);
            if (resolvedUrl) url = resolvedUrl;
          }

          if (url && audioRef.current) {
            const sourceLabel = (currentTrack.source || 'unknown').toUpperCase();
            console.log(`%cOracle: Manifesting Audio Bitstream from ${sourceLabel} for "${currentTrack.title}" | URL: ${url}`, "color: #FFD700; font-weight: 900;");
            
            // Aggressive buffer reset
            audioRef.current.pause();
            audioRef.current.src = url;
            audioRef.current.load();
            
            if (isPlaying) {
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch((e) => {
                  console.warn("%cOracle: Autoplay blocked or interrupted.", "color: #FFA500;", e);
                  setIsPlaying(false);
                });
              }
            }
          } else {
            console.error(`%cOracle: Failed to resolve stream URL for "${currentTrack.title}"`, "color: #FF0000;");
            setIsBuffering(false);
          }
        } catch (error) {
          console.error("%cOracle: Manifestation initialization failed.", "color: #FF0000;", error);
          setIsBuffering(false);
        }
      }
    };

    initializePlayback();
  }, [currentTrack?.id, settings.isVideoVisible]);

  // Synchronized Controls
  useEffect(() => {
    if (!currentTrack) return;
    const isYT = currentTrack.isYouTube || currentTrack.source === 'youtube' || currentTrack.id.length === 11;

    if (isYT && settings.isVideoVisible && ytPlayerRef.current) {
      if (isPlaying) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.id, settings.isVideoVisible]);

  // Volume & Seek
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (seekRequest !== null) {
      const isYT = currentTrack?.isYouTube || currentTrack?.source === 'youtube' || currentTrack?.id?.length === 11;
      if (isYT && settings.isVideoVisible && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(seekRequest, true);
      } else if (audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
        audioRef.current.currentTime = seekRequest;
      }
    }
  }, [seekRequest, currentTrack?.id]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying && settings.isVideoVisible) event.target.playVideo();
    
    setInterval(() => {
      if (ytPlayerRef.current && settings.isVideoVisible) {
        const time = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        if (!isNaN(time)) setProgress(time);
        if (!isNaN(dur) && dur > 0) setDuration(dur);
      }
    }, 500);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      setIsBuffering(false);
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
    } else if (event.data === 0) { // Ended
      console.log("%cOracle: Video Sanctuary ended. Summoning next track...", "color: #FFD700;");
      nextTrack();
    } else if (event.data === 3) { // Buffering
      setIsBuffering(true);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
  };

  const isYT = currentTrack?.isYouTube || currentTrack?.source === 'youtube' || currentTrack?.id?.length === 11;
  const showVideo = isYT && settings.isVideoVisible;

  return (
    <>
      <div id="vibecraft-sovereign-audio-engine" className="hidden" />
      {isYT && (
        <div 
          className={cn(
            "fixed transition-all duration-500 z-[110] bg-black border-primary/20",
            showVideo 
              ? "top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 w-[90vw] md:w-[70vw] aspect-video rounded-2xl overflow-hidden border shadow-2xl" 
              : "opacity-0 pointer-events-none w-1 h-1 top-0 left-0"
          )}
        >
          <YouTube 
            videoId={currentTrack.videoId || currentTrack.id} 
            opts={opts} 
            onReady={onReady} 
            onStateChange={onStateChange}
            className="w-full h-full"
            containerClassName="w-full h-full"
          />
        </div>
      )}
    </>
  );
};