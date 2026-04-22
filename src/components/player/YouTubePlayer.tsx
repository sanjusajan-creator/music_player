"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubePlayer as YTPlayer, YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { detectAdInterruption } from '@/ai/flows/ad-interruption-detection';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    isMuted,
    setIsPlaying, 
    setIsBuffering,
    setIsAdPlaying,
    setProgress,
    setDuration,
    nextTrack,
  } = usePlayerStore();

  const playerRef = useRef<YTPlayer | null>(null);
  const [bufferingCount, setBufferingCount] = useState(0);

  // Sync state with store
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Periodic updates for progress and ad detection
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!playerRef.current || !isPlaying) return;

      const currentTime = playerRef.current.getCurrentTime();
      const totalTime = playerRef.current.getDuration();
      const playerStateValue = playerRef.current.getPlayerState();
      
      setProgress(currentTime);
      setDuration(totalTime);

      // Ad Detection Logic using GenAI
      if (currentTrack) {
        try {
          // Approximate check every 2 seconds
          const playerStateMap: Record<number, any> = {
            [-1]: 'UNSTARTED',
            [0]: 'ENDED',
            [1]: 'PLAYING',
            [2]: 'PAUSED',
            [3]: 'BUFFERING',
            [5]: 'CUED'
          };

          const adDetection = await detectAdInterruption({
            expectedTrackDurationSeconds: currentTrack.duration || 180, // Fallback to 3m
            currentVideoDurationSeconds: totalTime,
            currentPlaybackTimeSeconds: currentTime,
            playerState: playerStateMap[playerStateValue] || 'UNSTARTED',
            recentBufferingCount: bufferingCount,
            playerQuality: playerRef.current.getPlaybackQuality?.(),
          });

          setIsAdPlaying(adDetection.isAdDetected);
        } catch (err) {
          console.error("Ad detection failed", err);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, bufferingCount]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(volume);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1: Playing, 2: Paused, 3: Buffering, 0: Ended
    if (event.data === 1) {
      setIsPlaying(true);
      setIsBuffering(false);
      setBufferingCount(0);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 3) {
      setIsBuffering(true);
      setBufferingCount(prev => prev + 1);
    } else if (event.data === 0) {
      nextTrack();
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="yt-player-hidden">
      <YouTube
        videoId={currentTrack.id}
        opts={{
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 1,
            controls: 0,
            showinfo: 0,
            rel: 0,
            iv_load_policy: 3,
            modestbranding: 1,
          },
        }}
        onReady={onReady}
        onStateChange={onStateChange}
      />
    </div>
  );
};