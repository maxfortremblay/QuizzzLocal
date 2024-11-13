import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioOptions {
  initialVolume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  onError?: (error: string) => void;
}

interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isMuted: boolean;
}

export const useAudio = (options: UseAudioOptions = {}) => {
  const {
    initialVolume = 1,
    fadeInDuration = 1000,
    fadeOutDuration = 1000,
    onError
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number>();

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    volume: initialVolume,
    currentTime: 0,
    duration: 0,
    isMuted: false
  });

  // Gestion de l'audio
  const load = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      setState(prev => ({ ...prev, currentTime: 0 }));
    }
  }, []);

  const play = useCallback(async (url?: string) => {
    try {
      if (url) {
        load(url);
      }
      
      if (audioRef.current) {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (error) {
      onError?.('Erreur de lecture audio');
    }
  }, [load, onError]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Gestion du volume avec fade
  const fadeVolume = useCallback((targetVolume: number, duration: number) => {
    if (!audioRef.current) return;

    const startVolume = audioRef.current.volume;
    const startTime = Date.now();
    const endTime = startTime + duration;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    fadeIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const progress = (now - startTime) / duration;

      if (now >= endTime) {
        if (audioRef.current) {
          audioRef.current.volume = targetVolume;
        }
        setState(prev => ({ ...prev, volume: targetVolume }));
        clearInterval(fadeIntervalRef.current);
        return;
      }

      const currentVolume = startVolume + (targetVolume - startVolume) * progress;
      if (audioRef.current) {
        audioRef.current.volume = currentVolume;
      }
      setState(prev => ({ ...prev, volume: currentVolume }));
    }, 50);
  }, []);

  const setVolume = useCallback((volume: number, fade = false) => {
    if (fade) {
      fadeVolume(volume, volume > state.volume ? fadeInDuration : fadeOutDuration);
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
      setState(prev => ({ ...prev, volume }));
    }
  }, [state.volume, fadeInDuration, fadeOutDuration, fadeVolume]);

  // Gestion du mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  // Effets de nettoyage
  useEffect(() => {
    audioRef.current = new Audio();

    // Gestion des événements audio
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setState(prev => ({ ...prev, currentTime: audioRef.current!.currentTime }));
      }
    };

    const handleDurationChange = () => {
      if (audioRef.current) {
        setState(prev => ({ ...prev, duration: audioRef.current!.duration }));
      }
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('durationchange', handleDurationChange);
    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('durationchange', handleDurationChange);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    setVolume,
    toggleMute,
    seek: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
    load
  };
};