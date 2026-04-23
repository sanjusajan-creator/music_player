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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Cleanup for local audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Handle local track playback
  useEffect(() => {
    if (currentTrack?.isLocal && currentTrack.localFile) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener('timeupdate', () => {
          if (audioRef.current) setProgress(audioRef.current.currentTime);
        });
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        });
        audioRef.current.addEventListener('ended', () => {
          nextTrack();
        });
      }

      const url = URL.createObjectURL(currentTrack.localFile);
      audioRef.current.src = url;
      if (isPlaying) audioRef.current.play();

      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [currentTrack, nextTrack, setProgress, setDuration]);

  // Handle local audio control
  useEffect(() => {
    if (!audioRef.current || !currentTrack?.isLocal) return;
    if (isPlaying) audioRef.current.play();
    else audioRef.current.pause();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && seekRequest !== null && currentTrack?.isLocal) {
      audioRef.current.currentTime = seekRequest;
    }
  }, [seekRequest, currentTrack]);

  // Handle YouTube playback
  useEffect(() => {
    if (!playerRef.current || currentTrack?.isLocal) return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (playerRef.current && !currentTrack?.isLocal) playerRef.current.setVolume(volume);
  }, [volume, currentTrack]);

  useEffect(() => {
    if (playerRef.current && seekRequest !== null && !currentTrack?.isLocal) {
      playerRef.current.seekTo(seekRequest, true);
    }
  }, [seekRequest, currentTrack]);

  // Fetch recommendations for cloud tracks
  useEffect(() => {
    if (currentTrack && !currentTrack.isLocal) {
      getRelatedVideos(currentTrack.id).then(setRecommendations);
    }
  }, [currentTrack]);

  // Update progress for YouTube
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isPlaying || !currentTrack || currentTrack.isLocal) return;

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
        setCurrentTrack(recommendations[0]);
      } else {
        nextTrack();
      }
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="yt-player-hidden">
      {!currentTrack.isLocal && (
        <YouTube
          videoId={currentTrack.id}
          opts={{
            height: '1', width: '1',
            playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1 },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      )}
    </div>
  );
};
