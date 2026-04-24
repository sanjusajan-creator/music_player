
"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubePlayer as YTPlayer, YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    setIsPlaying, 
    setIsBuffering,
    setIsAdPlaying,
    setProgress,
    setDuration,
    nextTrack,
    seekRequest
  } = usePlayerStore();

  const playerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrl = useRef<string | null>(null);
  const [origin, setOrigin] = useState('');

  // Handle Hydration Origin
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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

      audio.addEventListener('error', () => {
        const err = audio.error;
        // Sovereign Shield: Silence errors when src is invalid or resetting
        if (!audio.src || audio.src === window.location.href || audio.src === "" || audio.src.includes('null')) return;
        
        console.error("Vibecraft Audio Engine Error:", 
          err?.code || 'Unknown Code',
          err?.message || 'Media source issue',
          audio.src
        );
      });

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [nextTrack, setProgress, setDuration]);

  // Handle Track Source Switching
  useEffect(() => {
    if (!currentTrack) return;

    // YouTube IDs are 11 chars and can contain -, _, A-Z, a-z, 0-9
    const isYouTube = !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11;
    const isNative = currentTrack.isLocal || !!currentTrack.previewUrl;

    if (isNative && audioRef.current) {
      if (playerRef.current) {
        try { playerRef.current.pauseVideo(); } catch (e) {}
      }

      let url = "";
      if (currentTrack.isLocal && currentTrack.localFile) {
        if (currentBlobUrl.current) URL.revokeObjectURL(currentBlobUrl.current);
        url = URL.createObjectURL(currentTrack.localFile);
        currentBlobUrl.current = url;
      } else if (currentTrack.previewUrl) {
        url = currentTrack.previewUrl;
      }

      // Sovereign Shield: Validate URL
      if (url && url.length > 5 && audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.load();
        
        const handleCanPlay = () => {
          if (isPlaying) audioRef.current?.play().catch(() => {});
          audioRef.current?.removeEventListener('canplay', handleCanPlay);
        };
        audioRef.current.addEventListener('canplay', handleCanPlay);
      }
    } else if (isYouTube && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [currentTrack, isPlaying]);

  // Handle Global Play/Pause
  useEffect(() => {
    const isNative = currentTrack?.isLocal || !!currentTrack?.previewUrl;
    
    if (isNative && audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    } else if (playerRef.current) {
      try {
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch (e) {}
    }
  }, [isPlaying, currentTrack]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (playerRef.current) {
      try { playerRef.current.setVolume(volume); } catch(e) {}
    }
  }, [volume]);

  // Handle Seek
  useEffect(() => {
    if (seekRequest !== null) {
      const isNative = currentTrack?.isLocal || !!currentTrack?.previewUrl;
      if (isNative && audioRef.current && audioRef.current.src.length > 5) {
        audioRef.current.currentTime = seekRequest;
      } else if (playerRef.current) {
        try { playerRef.current.seekTo(seekRequest, true); } catch (e) {}
      }
    }
  }, [seekRequest, currentTrack]);

  // Progress & Ad Detection (YouTube only)
  useEffect(() => {
    const interval = setInterval(() => {
      const isYouTube = currentTrack && !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11;
      if (!playerRef.current || !isPlaying || !isYouTube) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const totalTime = playerRef.current.getDuration();
        
        if (currentTime > 0) setProgress(currentTime);
        if (totalTime > 0) setDuration(totalTime);

        if (currentTrack?.duration && totalTime > 0) {
          const diff = Math.abs(totalTime - currentTrack.duration);
          setIsAdPlaying(diff > 5);
        }
      } catch (e) {}
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, setIsAdPlaying, setProgress, setDuration]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(volume);
    if (isPlaying) playerRef.current.playVideo();
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      setIsBuffering(false);
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
    } else if (event.data === 3) { // Buffering
      setIsBuffering(true);
    } else if (event.data === 0) { // Ended
      nextTrack();
    }
  };

  if (!currentTrack) return null;

  const isYouTubeTrack = !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11;

  return (
    <div className="yt-player-hidden">
      {isYouTubeTrack ? (
        <YouTube
          videoId={currentTrack.id}
          opts={{
            height: '1', width: '1',
            playerVars: { 
              autoplay: 1, 
              controls: 0, 
              rel: 0, 
              modestbranding: 1, 
              origin: origin || undefined
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      ) : (
        <div id="vibecraft-native-engine-active" />
      )}
    </div>
  );
};
