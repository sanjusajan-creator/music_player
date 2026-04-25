"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { cn } from '@/lib/utils';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, isPlaying, volume, setIsPlaying, setIsBuffering,
    setProgress, setDuration, nextTrack, seekRequest, tickSleepTimer, settings
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(timer);
  }, [tickSleepTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('ended', () => nextTrack());
      audio.addEventListener('waiting', () => setIsBuffering(true));
      audio.addEventListener('playing', () => { setIsBuffering(false); setIsPlaying(true); });
      audio.addEventListener('error', (e) => {
        const err = audio.error;
        if (err?.code === 4) return;
        console.warn("%cOracle: Bitstream failed. Activating Video Sanctuary Fallback.", "color: #FFD700;");
        setUseIframeFallback(true);
        setIsBuffering(false);
      });
      audioRef.current = audio;
    }
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  useEffect(() => {
    const init = async () => {
      setUseIframeFallback(false);
      if (!currentTrack) return;

      if (currentTrack.isYouTube && (settings.isVideoVisible || useIframeFallback)) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      } else {
        if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
        const url = await resolveTrackAudio(currentTrack);
        if (url && audioRef.current) {
          audioRef.current.src = url;
          if (isPlaying) audioRef.current.play().catch(() => setUseIframeFallback(true));
        } else if (currentTrack.isYouTube) {
          setUseIframeFallback(true);
        }
      }
    };
    init();
  }, [currentTrack?.id, settings.isVideoVisible, useIframeFallback]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!currentTrack) return;
    const isYT = currentTrack.isYouTube && (settings.isVideoVisible || useIframeFallback);
    if (isYT && ytPlayerRef.current) {
      if (isPlaying) ytPlayerRef.current.playVideo(); else ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current?.src) {
      if (isPlaying) audioRef.current.play().catch(() => {}); else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.id, settings.isVideoVisible, useIframeFallback]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);
    setInterval(() => {
      if (ytPlayerRef.current && (settings.isVideoVisible || useIframeFallback)) {
        setProgress(ytPlayerRef.current.getCurrentTime());
        setDuration(ytPlayerRef.current.getDuration());
      }
    }, 500);
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%', width: '100%',
    playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
  };

  const showVideo = currentTrack?.isYouTube && (settings.isVideoVisible || useIframeFallback);

  return (
    <div className={cn("fixed transition-all duration-500 z-[110] bg-black", showVideo ? "top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 w-[90vw] md:w-[70vw] aspect-video rounded-2xl overflow-hidden border border-primary/20" : "opacity-0 pointer-events-none w-1 h-1")}>
      {currentTrack?.isYouTube && <YouTube videoId={currentTrack.videoId || currentTrack.id} opts={opts} onReady={onReady} onStateChange={(e) => { if (e.data === 0) nextTrack(); if (e.data === 1) setIsPlaying(true); if (e.data === 2) setIsPlaying(false); }} className="w-full h-full" containerClassName="w-full h-full" />}
    </div>
  );
};
