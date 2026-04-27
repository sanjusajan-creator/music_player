"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolveTrackAudio } from '@/app/actions/youtube-search';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShallow } from 'zustand/react/shallow';

const MOBILE_PLAYER_STATE_KEY = 'musicPlayerState';

const parseSavedState = (value: string | null): { isPlaying?: boolean; progress?: number; currentTrackId?: string } | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const stopPlayback = (audio: HTMLAudioElement | null, ytPlayer: any) => {
  if (ytPlayer) {
    try {
      ytPlayer.stopVideo();
    } catch {}
  }

  if (!audio) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
};

const setAudioSource = async (audio: HTMLAudioElement, src: string, shouldPlay: boolean) => {
  audio.src = src;
  audio.load();
  if (!shouldPlay) return;
  try {
    await audio.play();
  } catch {
    console.warn('%cOracle: Autoplay denied.', 'color:#FFD700;');
  }
};

const resolveAndLoadTrack = async ({
  track,
  shouldPlay,
  audio,
  setIsBuffering,
  setIframeVideoId,
}: {
  track: any;
  shouldPlay: boolean;
  audio: HTMLAudioElement;
  setIsBuffering: (value: boolean) => void;
  setIframeVideoId: (value: string | null) => void;
}) => {
  if (track.isLocal && track.localFile) {
    await setAudioSource(audio, URL.createObjectURL(track.localFile), shouldPlay);
    setIsBuffering(false);
    return;
  }

  const url = await resolveTrackAudio(track);

  if (url?.startsWith('yt-fallback:')) {
    setIframeVideoId(url.replace('yt-fallback:', ''));
    setIsBuffering(false);
    return;
  }

  if (url) {
    await setAudioSource(audio, url, shouldPlay);
    setIsBuffering(false);
    return;
  }

  setIsBuffering(false);
  console.warn('Oracle: No audio URL resolved for track', track.title);
};

export const YouTubePlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    seekRequest,
    progress,
  } = usePlayerStore(
    useShallow((state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      volume: state.volume,
      seekRequest: state.seekRequest,
      progress: state.progress,
    }))
  );

  const {
    setIsPlaying,
    setIsBuffering,
    setProgress,
    setDuration,
    nextTrack,
    tickSleepTimer,
  } = usePlayerStore(
    useShallow((state) => ({
      setIsPlaying: state.setIsPlaying,
      setIsBuffering: state.setIsBuffering,
      setProgress: state.setProgress,
      setDuration: state.setDuration,
      nextTrack: state.nextTrack,
      tickSleepTimer: state.tickSleepTimer,
    }))
  );

  const isMobileDevice = useIsMobile();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekRef = useRef<number | null>(null);

  // ── STATE (triggers re-renders) ──────────────────────────────────
  // iframeVideoId being non-null means "mount the iframe and play this id"
  const [iframeVideoId, setIframeVideoId] = useState<string | null>(null);

  // Sleep timer tick
  useEffect(() => {
    const timer = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(timer);
  }, [tickSleepTimer]);

  // ── Audio element init (once) ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || audioRef.current) return;

    const audio = new Audio();
    audio.preload = 'auto';

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => nextTrack();
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const handleError = () => {
      const err = audio.error;
      if (err?.code === 4 && !audio.src) return;
      console.error(`%cOracle: Audio engine failure. Code: ${err?.code}`, "color:#FF0000;font-weight:bold;");
      setIsBuffering(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, [nextTrack, setDuration, setIsBuffering, setIsPlaying, setProgress]);

  // ── Iframe progress poll ─────────────────────────────────────────
  const pollIframeProgress = useCallback(() => {
    if (!ytPlayerRef.current || !iframeVideoId) return;
    try {
      const state = ytPlayerRef.current.getPlayerState();
      if (state === 1) { // playing
        const t = ytPlayerRef.current.getCurrentTime();
        const d = ytPlayerRef.current.getDuration();
        if (d > 0) { setProgress(t); setDuration(d); }
      }
    } catch (e) {}
  }, [iframeVideoId, setProgress, setDuration]);

  useEffect(() => {
    progressIntervalRef.current = setInterval(pollIframeProgress, 500);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [pollIframeProgress]);

  // ── Core track resolution ────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    const init = async () => {
      lastSeekRef.current = null;
      setIsBuffering(true);

      stopPlayback(audioRef.current, ytPlayerRef.current);
      ytPlayerRef.current = null;
      setIframeVideoId(null);

      if (audioRef.current) {
        await resolveAndLoadTrack({
          track: currentTrack,
          shouldPlay: isPlaying,
          audio: audioRef.current,
          setIsBuffering,
          setIframeVideoId,
        });
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // ── Volume sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayerRef.current) { try { ytPlayerRef.current.setVolume(volume); } catch (e) {} }
  }, [volume]);

  // ── Play / Pause sync ────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    if (iframeVideoId && ytPlayerRef.current) {
      try { isPlaying ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo(); } catch (e) {}
    } else if (!iframeVideoId && audioRef.current?.src) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.id, iframeVideoId]);

  // ── Seek sync ────────────────────────────────────────────────────
  useEffect(() => {
    const seekTime = seekRequest ?? 0;
    if (seekTime === 0 || seekTime === lastSeekRef.current) return;
    lastSeekRef.current = seekTime;
    if (iframeVideoId && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(seekTime, true); } catch (e) {}
    } else if (audioRef.current?.src) {
      try { audioRef.current.currentTime = seekTime; } catch (e) {}
    }
  }, [seekRequest, iframeVideoId]);

  // ── Mobile background playback ───────────────────────────────────
  useEffect(() => {
    if (!isMobileDevice || !currentTrack) return;
    const handlePageHide = () => {
      if (isPlaying) localStorage.setItem(MOBILE_PLAYER_STATE_KEY, JSON.stringify({ isPlaying, progress, currentTrackId: currentTrack.id }));
    };
    const handlePageShow = () => {
      const state = parseSavedState(localStorage.getItem(MOBILE_PLAYER_STATE_KEY));
      if (!state) return;
      if (state.isPlaying) setIsPlaying(true);
      if (typeof state.progress === 'number' && Number.isFinite(state.progress)) {
        usePlayerStore.getState().seekTo(state.progress);
      }
      localStorage.removeItem(MOBILE_PLAYER_STATE_KEY);
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => { window.removeEventListener('pagehide', handlePageHide); window.removeEventListener('pageshow', handlePageShow); };
  }, [isMobileDevice, currentTrack, isPlaying, progress, setIsPlaying]);

  // ── Media Session API (Lock Screen & Background playback) ───────────
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Vibecraft Archive',
        artwork: [
          { src: currentTrack.thumbnail || 'https://picsum.photos/seed/vibecraft/512/512', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().previousTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().nextTrack());
      
      // Attempt to support seeking from lockscreen if the device allows it
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          usePlayerStore.getState().seekTo(details.seekTime);
        }
      });
    }
  }, [currentTrack, setIsPlaying]);

  // ── Iframe callbacks ─────────────────────────────────────────────
  const onReady: YouTubeProps['onReady'] = (event) => {
    ytPlayerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying) { try { event.target.playVideo(); } catch (e) {} }
  };

  const onStateChange = (e: { data: number }) => {
    if (e.data === 0) nextTrack();
    if (e.data === 1) { setIsPlaying(true); setIsBuffering(false); }
    if (e.data === 2) setIsPlaying(false);
    if (e.data === 3) setIsBuffering(true);
  };

  // ── Render ───────────────────────────────────────────────────────
  if (!iframeVideoId) return null;

  const isPlaylistId = ['PL', 'VL', 'RD', 'OL'].some(p => iframeVideoId.startsWith(p));

  const opts: YouTubeProps['opts'] = {
    height: '1', width: '1',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      ...(isPlaylistId ? { listType: 'playlist', list: iframeVideoId } : {})
    },
  };

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
    >
      <YouTube
        key={iframeVideoId}
        videoId={isPlaylistId ? undefined : iframeVideoId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
      />
    </div>
  );
};
