"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { cn } from '@/lib/utils';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, isPlaying, volume, setIsPlaying, setIsBuffering,
    setProgress, setDuration, nextTrack, tickSleepTimer, settings
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
      audio.addEventListener('playing', () => { 
        setIsBuffering(false); 
        setIsPlaying(true); 
        console.log(`%cOracle: Bitstream manifestation active via Native Audio.`, "color: #FFD700; font-weight: bold;");
      });

      audio.addEventListener('error', (e) => {
        const err = audio.error;
        // Ignore "Empty Src" errors during transitionary states
        if (err?.code === 4 && !audio.src) return;

        console.error(`%cOracle: Audio engine failure. Code: ${err?.code} | Message: ${err?.message}`, "color: #FF0000; font-weight: bold;");
        
        if (currentTrack?.isYouTube) {
          console.warn("%cOracle: Native bitstream blocked. Metamorphosing to Video Sanctuary Fallback.", "color: #FFD700; font-weight: bold;");
          setUseIframeFallback(true);
        }
        setIsBuffering(false);
      });

      audioRef.current = audio;
    }
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress, currentTrack?.id]);

  useEffect(() => {
    const init = async () => {
      setUseIframeFallback(false);
      if (!currentTrack) return;

      const isYouTubeManifestation = currentTrack.isYouTube && (settings.isVideoVisible || useIframeFallback);

      if (isYouTubeManifestation) {
        if (audioRef.current) { 
          audioRef.current.pause(); 
          audioRef.current.src = ""; 
        }
        console.log(`%cOracle: Initializing Video Sanctuary for ${currentTrack.title}`, "color: #FFD700;");
      } else {
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.stopVideo(); } catch (e) {}
        }
        
        const url = await resolveTrackAudio(currentTrack);
        
        if (url && audioRef.current) {
          audioRef.current.src = url;
          if (isPlaying) {
            audioRef.current.play().catch(e => {
              console.warn("%cOracle: Autoplay sanctuary denied. Waiting for user interaction.", "color: #FFD700;");
              if (currentTrack.isYouTube) setUseIframeFallback(true);
            });
          }
        } else if (currentTrack.isYouTube) {
          setUseIframeFallback(true);
        } else {
          console.error(`%cOracle: Void bitstream for ${currentTrack.title}. Source: ${currentTrack.source}`, "color: #FF0000;");
        }
      }
    };
    init();
  }, [currentTrack?.id, settings.isVideoVisible, useIframeFallback]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(volume); } catch (e) {}
    }
  }, [volume]);

  useEffect(() => {
    if (!currentTrack) return;
    const isYT = currentTrack.isYouTube && (settings.isVideoVisible || useIframeFallback);
    
    if (isYT && ytPlayerRef.current) {
      if (isPlaying) {
        try { ytPlayerRef.current.playVideo(); } catch (e) {}
      } else {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
    } else if (audioRef.current?.src) {
      if (isPlaying) audioRef.current.play().catch(() => {}); else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.id, settings.isVideoVisible, useIframeFallback]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);
    console.log(`%cOracle: Video Sanctuary manifested successfully.`, "color: #FFD700; font-weight: bold;");
    
    setInterval(() => {
      if (ytPlayerRef.current && (settings.isVideoVisible || useIframeFallback)) {
        try {
          setProgress(ytPlayerRef.current.getCurrentTime());
          setDuration(ytPlayerRef.current.getDuration());
        } catch (e) {}
      }
    }, 500);
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%', width: '100%',
    playerVars: { 
      autoplay: 1, 
      controls: 1, 
      modestbranding: 1, 
      rel: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined
    },
  };

  const showVideo = currentTrack?.isYouTube && (settings.isVideoVisible || useIframeFallback);

  return (
    <div className={cn(
      "fixed transition-all duration-500 z-[110] bg-black shadow-2xl", 
      showVideo 
        ? "top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 w-[95vw] md:w-[70vw] aspect-video rounded-3xl overflow-hidden border border-primary/30 gold-border-glow" 
        : "opacity-0 pointer-events-none w-1 h-1 scale-0"
    )}>
      {currentTrack?.isYouTube && (
        <YouTube 
          videoId={currentTrack.videoId || currentTrack.id} 
          opts={opts} 
          onReady={onReady} 
          onStateChange={(e) => { 
            if (e.data === 0) nextTrack(); 
            if (e.data === 1) setIsPlaying(true); 
            if (e.data === 2) setIsPlaying(false); 
          }} 
          className="w-full h-full" 
          containerClassName="w-full h-full" 
        />
      )}
    </div>
  );
};
