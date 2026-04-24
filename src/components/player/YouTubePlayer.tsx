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

  // Cleanup for local/preview audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Handle local track OR public API preview playback
  useEffect(() => {
    const isPublicPreview = currentTrack?.previewUrl && !currentTrack.isLocal;
    const isLocalTrack = currentTrack?.isLocal && currentTrack.localFile;

    if (isLocalTrack || isPublicPreview) {
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

      let url = "";
      if (isLocalTrack) {
        url = URL.createObjectURL(currentTrack.localFile!);
      } else if (isPublicPreview) {
        url = currentTrack.previewUrl!;
      }

      audioRef.current.src = url;
      if (isPlaying) audioRef.current.play();

      return () => {
        if (isLocalTrack) URL.revokeObjectURL(url);
      };
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [currentTrack, nextTrack, setProgress, setDuration]);

  // Handle Audio Control (Play/Pause)
  useEffect(() => {
    if (!audioRef.current) return;
    const isAudioActive = currentTrack?.isLocal || currentTrack?.previewUrl;
    if (!isAudioActive) return;

    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentTrack]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (playerRef.current && !currentTrack?.isLocal && !currentTrack?.previewUrl) {
      playerRef.current.setVolume(volume);
    }
  }, [volume, currentTrack]);

  // Handle Seek
  useEffect(() => {
    if (seekRequest !== null) {
      if (audioRef.current && (currentTrack?.isLocal || currentTrack?.previewUrl)) {
        audioRef.current.currentTime = seekRequest;
      } else if (playerRef.current && !currentTrack?.isLocal && !currentTrack?.previewUrl) {
        playerRef.current.seekTo(seekRequest, true);
      }
    }
  }, [seekRequest, currentTrack]);

  // Handle YouTube Playback
  useEffect(() => {
    if (!playerRef.current) return;
    const isYouTubeTrack = currentTrack && !currentTrack.isLocal && !currentTrack.previewUrl;
    if (!isYouTubeTrack) return;

    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying, currentTrack]);

  // Fetch recommendations for cloud tracks
  useEffect(() => {
    if (currentTrack && !currentTrack.isLocal) {
      getRelatedVideos(currentTrack.id).then(setRecommendations);
    }
  }, [currentTrack]);

  // Update progress for YouTube
  useEffect(() => {
    const interval = setInterval(() => {
      const isYouTubeTrack = currentTrack && !currentTrack.isLocal && !currentTrack.previewUrl;
      if (!playerRef.current || !isPlaying || !isYouTubeTrack) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const totalTime = playerRef.current.getDuration();
        
        setProgress(currentTime);
        setDuration(totalTime);

        if (currentTrack.duration && totalTime > 0) {
          const diff = Math.abs(totalTime - currentTrack.duration);
          const isAd = diff > 5; 
          setIsAdPlaying(isAd);
        }
      } catch (e) {}
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

  // Render YouTube component ONLY if it's a valid YouTube ID and not a preview/local track
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
        <div id="no-yt-active" />
      )}
    </div>
  );
};
