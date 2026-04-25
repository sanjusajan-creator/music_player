"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Vibecraft Sovereign Hybrid Engine
 * Manages dual-tier manifestation: HTML5 Native Audio & YouTube Iframe API.
 */
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

  // HTML5 Native Audio Engine Initialization
  useEffect(() => {
    if (!audioRef.current && typeof Audio !== 'undefined') {
      const audio = new Audio();
      audio.preload = "auto";
      
      audio.addEventListener('timeupdate', () => {
        if (!currentTrack?.isYouTube && audioRef.current && !isNaN(audioRef.current.currentTime)) {
          setProgress(audioRef.current.currentTime);
        }
      });
      
      audio.addEventListener('loadedmetadata', () => {
        if (!currentTrack?.isYouTube && audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (!currentTrack?.isYouTube) nextTrack();
      });
      
      audio.addEventListener('waiting', () => {
        if (!currentTrack?.isYouTube) setIsBuffering(true);
      });
      
      audio.addEventListener('playing', () => {
        if (!currentTrack?.isYouTube) {
          setIsBuffering(false);
          setIsPlaying(true);
        }
      });
      
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress, currentTrack?.isYouTube]);

  // Sovereign Manifestation Pipeline
  useEffect(() => {
    const initializePlayback = async () => {
      if (!currentTrack) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        if (ytPlayerRef.current) {
          ytPlayerRef.current.stopVideo();
        }
        return;
      }

      // Hardened Purge: Stop the other engine
      if (currentTrack.isYouTube) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        // YouTube Iframe component handles its own src change via videoId prop
      } else {
        if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
        
        let url = "";
        let sourceLog = "Unknown Vault";

        try {
          setIsBuffering(true);
          
          if (currentTrack.source === 'local' && currentTrack.localFile) {
            url = URL.createObjectURL(currentTrack.localFile);
            sourceLog = "Local Vault";
          } else if (currentTrack.streamUrl && currentTrack.source !== 'youtube') {
            url = currentTrack.streamUrl;
            sourceLog = `${currentTrack.source?.toUpperCase()} Unified Stream`;
          } else {
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
              audioRef.current.play().catch(() => setIsPlaying(false));
            }
          } else {
            setIsBuffering(false);
          }
        } catch (error) {
          setIsBuffering(false);
        }
      }
    };

    initializePlayback();
  }, [currentTrack?.id]);

  // Synchronized Play/Pause Controls
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.isYouTube) {
      if (ytPlayerRef.current) {
        if (isPlaying) ytPlayerRef.current.playVideo();
        else ytPlayerRef.current.pauseVideo();
      }
    } else if (audioRef.current && audioRef.current.src) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.isYouTube]);

  // Volume Synchronization
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(volume);
  }, [volume]);

  // Seek Synchronization
  useEffect(() => {
    if (seekRequest !== null) {
      if (currentTrack?.isYouTube && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(seekRequest, true);
      } else if (audioRef.current && audioRef.current.src) {
        audioRef.current.currentTime = seekRequest;
      }
    }
  }, [seekRequest, currentTrack?.isYouTube]);

  // YouTube Iframe Engine Configuration
  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying) event.target.playVideo();
    
    // Start Heartbeat for progress
    const timer = setInterval(() => {
      if (ytPlayerRef.current && currentTrack?.isYouTube) {
        const time = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        if (!isNaN(time)) setProgress(time);
        if (!isNaN(dur) && dur > 0) setDuration(dur);
      }
    }, 500);

    return () => clearInterval(timer);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    if (event.data === 1) {
      setIsPlaying(true);
      setIsBuffering(false);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      nextTrack();
    } else if (event.data === 3) {
      setIsBuffering(true);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  // The video element must remain mounted to keep playback active when hidden
  const showVideo = isFullPlayer && settings.isVideoVisible && currentTrack?.isYouTube;

  return (
    <>
      <div id="vibecraft-sovereign-audio-engine" className="hidden" />
      {currentTrack?.isYouTube && (
        <div 
          className={cn(
            "fixed transition-all duration-500 z-[110] bg-black border-primary/20",
            showVideo 
              ? "top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 w-[90vw] md:w-[70vw] aspect-video rounded-2xl overflow-hidden border shadow-2xl" 
              : "opacity-0 pointer-events-none w-1 h-1 top-0 left-0"
          )}
        >
          <YouTube 
            videoId={currentTrack.videoId} 
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
