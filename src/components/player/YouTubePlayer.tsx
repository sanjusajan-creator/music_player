"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubePlayer as YTPlayer, YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getRelatedVideos } from '@/lib/youtube';

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
    isAutoplay,
    setCurrentTrack
  } = usePlayerStore();

  const playerRef = useRef<YTPlayer | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (playerRef.current && seekRequest !== null) {
      playerRef.current.seekTo(seekRequest, true);
    }
  }, [seekRequest]);

  // Fetch recommendations for current track
  useEffect(() => {
    if (currentTrack) {
      getRelatedVideos(currentTrack.id).then(setRecommendations);
    }
  }, [currentTrack]);

  // Update progress and detect ads
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isPlaying || !currentTrack) return;

      const currentTime = playerRef.current.getCurrentTime();
      const totalTime = playerRef.current.getDuration();
      
      setProgress(currentTime);
      setDuration(totalTime);

      if (currentTrack.duration && totalTime > 0) {
        const diff = Math.abs(totalTime - currentTrack.duration);
        const isAd = diff > 5; 
        setIsAdPlaying(isAd);
      }
    }, 1000);

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
      const { queue } = usePlayerStore.getState();
      if (queue.length > 0) {
        nextTrack();
      } else if (isAutoplay && recommendations.length > 0) {
        // Autoplay logic: Pick the first recommendation
        setCurrentTrack(recommendations[0]);
      } else {
        nextTrack();
      }
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