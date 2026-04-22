"use client";

import React, { useEffect, useRef } from 'react';
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
  } = usePlayerStore();

  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.setVolume(volume);
  }, [volume]);

  // Throttled Ad Detection (Manual Logic)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isPlaying || !currentTrack) return;

      const currentTime = playerRef.current.getCurrentTime();
      const totalTime = playerRef.current.getDuration();
      
      setProgress(currentTime);
      setDuration(totalTime);

      // Manual Ad Logic: Check duration discrepancy
      // If the currently playing video duration is significantly different from expected track duration
      if (currentTrack.duration && totalTime > 0) {
        const diff = Math.abs(totalTime - currentTrack.duration);
        // Typical ads are 5s, 15s, 30s. If diff is large, it's an ad.
        const isAd = diff > 5; 
        setIsAdPlaying(isAd);
      }
    }, 15000); // Throttled to 15 seconds as requested

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, setIsAdPlaying, setProgress, setDuration]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(volume);
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

  return (
    <div className="yt-player-hidden">
      <YouTube
        videoId={currentTrack.id}
        opts={{
          height: '1', width: '1',
          playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1 },
        }}
        onReady={onReady}
        onStateChange={onStateChange}
      />
    </div>
  );
};