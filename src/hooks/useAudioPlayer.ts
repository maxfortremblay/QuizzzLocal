// src/hooks/useAudioPlayer.ts
import { useCallback, useRef } from 'react';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(new Audio());

  const play = useCallback((url: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.play();
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  return {
    play,
    stop
  };
};