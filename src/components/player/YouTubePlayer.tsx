"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { cn } from '@/lib/utils';

export const YouTubePlayer: React.FC = () => {
  const { 
    currentTrack, isPlaying, volume, setIsPlaying, setIsBuffering,
    setProgress, setDuration, nextTrack, tickSleepTimer, settings,
    seekRequest, progress
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekRef = useRef<number | null>(null);
  // Track whether the current track is using iframe vs audio element
  const usingIframeRef = useRef<boolean>(false);

  // Sleep timer tick
  useEffect(() => {
    const timer = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(timer);
  }, [tickSleepTimer]);

  // Initialize audio element ONCE
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      audio.addEventListener('timeupdate', () => {
        if (!usingIframeRef.current) setProgress(audio.currentTime);
      });
      audio.addEventListener('loadedmetadata', () => {
        if (!usingIframeRef.current) setDuration(audio.duration);
      });
      audio.addEventListener('ended', () => nextTrack());
      audio.addEventListener('waiting', () => setIsBuffering(true));
      audio.addEventListener('canplay', () => setIsBuffering(false));
      audio.addEventListener('playing', () => {
        setIsBuffering(false);
        setIsPlaying(true);
      });
      audio.addEventListener('error', () => {
        const err = audio.error;
        if (err?.code === 4 && !audio.src) return;
        console.error(`%cOracle: Audio engine failure. Code: ${err?.code}`, "color: #FF0000; font-weight: bold;");
        setIsBuffering(false);
      });

      audioRef.current = audio;
    }
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  // Poll iframe progress when using YouTube iframe
  const trackIframeProgress = useCallback(() => {
    if (ytPlayerRef.current && usingIframeRef.current) {
      try {
        const playerState = ytPlayerRef.current.getPlayerState();
        if (playerState === 1) {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration();
          if (duration > 0) {
            setProgress(currentTime);
            setDuration(duration);
          }
        }
      } catch (e) {}
    }
  }, [setProgress, setDuration]);

  useEffect(() => {
    progressIntervalRef.current = setInterval(trackIframeProgress, 500);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [trackIframeProgress]);

  // ─── Core Track Resolution ───────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!currentTrack) return;

      // Reset state
      lastSeekRef.current = null;
      setIsBuffering(true);

      // Stop YouTube iframe if it was playing
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo(); } catch (e) {}
      }

      // Clear audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      // LOCAL files → use ObjectURL directly
      if (currentTrack.isLocal && currentTrack.localFile) {
        usingIframeRef.current = false;
        const url = URL.createObjectURL(currentTrack.localFile);
        audioRef.current!.src = url;
        audioRef.current!.load();
        if (isPlaying) {
          audioRef.current!.play().catch(() => {});
        }
        setIsBuffering(false);
        return;
      }

      // YOUTUBE → use iframe (fastest, no proxy needed)
      if (currentTrack.isYouTube && settings.useIframeForYouTube) {
        usingIframeRef.current = true;
        // The iframe will autoplay via onReady / cueVideoById
        setIsBuffering(false);
        return;
      }

      // SAAVN / GAANA / YT without iframe → resolve raw stream URL
      const url = await resolveTrackAudio(currentTrack);

      if (url && audioRef.current) {
        usingIframeRef.current = false;
        audioRef.current.src = url;
        audioRef.current.load();
        if (isPlaying) {
          audioRef.current.play().catch(() => {
            console.warn("%cOracle: Autoplay denied by browser.", "color: #FFD700;");
          });
        }
      } else if (currentTrack.isYouTube && !url) {
        // Proxy failed – force iframe as fallback
        usingIframeRef.current = true;
        usePlayerStore.getState().updateSettings({ useIframeForYouTube: true });
        setIsBuffering(false);
      } else {
        setIsBuffering(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(volume); } catch (e) {}
    }
  }, [volume]);

  // Play / Pause sync
  useEffect(() => {
    if (!currentTrack) return;

    if (usingIframeRef.current && ytPlayerRef.current) {
      if (isPlaying) {
        try { ytPlayerRef.current.playVideo(); } catch (e) {}
      } else {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
    } else if (!usingIframeRef.current && audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack?.id]);

  // Seek sync
  useEffect(() => {
    const seekTime = seekRequest ?? 0;
    if (seekTime === 0 || seekTime === lastSeekRef.current) return;
    lastSeekRef.current = seekTime;

    if (usingIframeRef.current && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(seekTime, true); } catch (e) {}
    } else if (audioRef.current?.src) {
      try { audioRef.current.currentTime = seekTime; } catch (e) {}
    }
  }, [seekRequest]);

  // ─── YouTube iframe callbacks ────────────────────────────────────
  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);

    if (usingIframeRef.current && isPlaying) {
      try { event.target.playVideo(); } catch (e) {}
    }
  };

  const onStateChange = (e: { data: number }) => {
    // -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
    if (e.data === 0) nextTrack();
    if (e.data === 1) { setIsPlaying(true); setIsBuffering(false); }
    if (e.data === 2) setIsPlaying(false);
    if (e.data === 3) setIsBuffering(true);
  };

  const isPlaylist = ['PL', 'VL', 'RD', 'OL'].some(prefix => 
    currentTrack?.videoId?.startsWith(prefix) || currentTrack?.id?.startsWith(prefix)
  );
  const trackId = currentTrack?.videoId || currentTrack?.id || "";

  const opts: YouTubeProps['opts'] = {
    height: '100%', width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      ...(isPlaylist ? { listType: 'playlist', list: trackId } : {})
    },
  };

  const showVideo = currentTrack?.isYouTube && settings.isVideoVisible;
  const mountIframe = currentTrack?.isYouTube && (settings.isVideoVisible || settings.useIframeForYouTube);

  return (
    <div className={cn(
      "fixed transition-all duration-300 z-[55] bg-black shadow-2xl",
      showVideo
        ? "bottom-20 md:bottom-24 left-4 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-primary/30 gold-border-glow"
        : "opacity-0 pointer-events-none w-1 h-1"
    )}>
      {mountIframe && (
        <YouTube
          videoId={isPlaylist ? undefined : trackId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          className="w-full h-full"
        />
      )}
    </div>
  );
};