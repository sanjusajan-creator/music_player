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
    seekRequest,
    setCurrentTrack
  } = usePlayerStore();

  const playerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Native Audio Engine
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      
      audio.addEventListener('timeupdate', () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      
      audio.addEventListener('loadedmetadata', () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      });
      
      audio.addEventListener('ended', () => {
        nextTrack();
      });

      audio.addEventListener('error', (e) => {
        console.error("Vibecraft Audio Engine Error:", e);
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

    const isYouTube = !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11 && !currentTrack.id.includes('-');
    const isNative = currentTrack.isLocal || currentTrack.previewUrl;

    if (isNative && audioRef.current) {
      // Pause YouTube if it exists
      if (playerRef.current) {
        try { playerRef.current.pauseVideo(); } catch (e) {}
      }

      let url = "";
      if (currentTrack.isLocal && currentTrack.localFile) {
        url = URL.createObjectURL(currentTrack.localFile);
      } else if (currentTrack.previewUrl) {
        url = currentTrack.previewUrl;
      }

      if (url && audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.load();
        if (isPlaying) {
          audioRef.current.play().catch(err => {
            console.warn("Vibecraft: Autoplay prevented for native source.", err);
          });
        }
      }

      return () => {
        if (currentTrack.isLocal && url) URL.revokeObjectURL(url);
      };
    } else if (isYouTube && audioRef.current) {
      // Stop native audio if we are on YouTube
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [currentTrack, isPlaying]);

  // Handle Play/Pause Control (Global)
  useEffect(() => {
    const isNative = currentTrack?.isLocal || currentTrack?.previewUrl;
    
    if (isNative && audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    } else if (playerRef.current) {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [isPlaying, currentTrack]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (playerRef.current) playerRef.current.setVolume(volume);
  }, [volume]);

  // Handle Seek
  useEffect(() => {
    if (seekRequest !== null) {
      const isNative = currentTrack?.isLocal || currentTrack?.previewUrl;
      if (isNative && audioRef.current) {
        audioRef.current.currentTime = seekRequest;
      } else if (playerRef.current) {
        playerRef.current.seekTo(seekRequest, true);
      }
    }
  }, [seekRequest, currentTrack]);

  // Update YouTube Progress
  useEffect(() => {
    const interval = setInterval(() => {
      const isYouTube = currentTrack && !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11 && !currentTrack.id.includes('-');
      if (!playerRef.current || !isPlaying || !isYouTube) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const totalTime = playerRef.current.getDuration();
        
        setProgress(currentTime);
        setDuration(totalTime);

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

  const isYouTubeTrack = !currentTrack.isLocal && !currentTrack.previewUrl && currentTrack.id.length === 11 && !currentTrack.id.includes('-');

  return (
    <div className="yt-player-hidden">
      {isYouTubeTrack ? (
        <YouTube
          videoId={currentTrack.id}
          opts={{
            height: '1', width: '1',
            playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1 },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      ) : (
        <div id="vibecraft-native-active" />
      )}
    </div>
  );
};