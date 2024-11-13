import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { createAudioFade, handleAudioError } from '../utils/audioUtils';
import { useGame } from './GameContext';

// Types
interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  error: string | null;
  currentSrc: string | null;
}

interface AudioContextValue extends AudioState {
  play: (url?: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number, fade?: boolean) => void;
  toggleMute: () => void;
  seekTo: (time: number) => void;
}

// Création du contexte
const AudioContext = createContext<AudioContextValue | undefined>(undefined);

// Types pour le reducer
type AudioAction =
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_MUTED'; isMuted: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SOURCE'; src: string | null };

// État initial
const initialState: AudioState = {
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  isMuted: false,
  error: null,
  currentSrc: null
};

// Reducer
function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume };
    case 'SET_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_MUTED':
      return { ...state, isMuted: action.isMuted };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_SOURCE':
      return { ...state, currentSrc: action.src };
    default:
      return state;
  }
}

// Provider
export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { state: gameState } = useGame();

  // Initialisation de l'élément audio
  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;
    
    audio.addEventListener('timeupdate', () => {
      dispatch({ type: 'SET_TIME', time: audio.currentTime });
    });

    audio.addEventListener('durationchange', () => {
      dispatch({ type: 'SET_DURATION', duration: audio.duration });
    });

    audio.addEventListener('ended', () => {
      dispatch({ type: 'SET_PLAYING', isPlaying: false });
    });

    audio.addEventListener('error', () => {
      const errorMessage = handleAudioError(audio.error);
      dispatch({ type: 'SET_ERROR', error: errorMessage });
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Actions
  const play = useCallback(async (url?: string) => {
    if (!audioRef.current) return;

    try {
      if (url) {
        audioRef.current.src = url;
        dispatch({ type: 'SET_SOURCE', src: url });
      }

      await audioRef.current.play();
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: handleAudioError(error) });
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    dispatch({ type: 'SET_PLAYING', isPlaying: false });
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    dispatch({ type: 'SET_PLAYING', isPlaying: false });
    dispatch({ type: 'SET_TIME', time: 0 });
  }, []);

  const setVolume = useCallback(async (volume: number, fade = false) => {
    if (!audioRef.current) return;

    if (fade) {
      await createAudioFade(audioRef.current, {
        startVolume: state.volume,
        endVolume: volume,
        duration: 1000,
        onUpdate: (v) => dispatch({ type: 'SET_VOLUME', volume: v })
      });
    } else {
      audioRef.current.volume = volume;
      dispatch({ type: 'SET_VOLUME', volume });
    }
  }, [state.volume]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !state.isMuted;
    dispatch({ type: 'SET_MUTED', isMuted: !state.isMuted });
  }, [state.isMuted]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    dispatch({ type: 'SET_TIME', time });
  }, []);

  // Synchronisation avec le gameState
  useEffect(() => {
    if (gameState === 'finished') {
      stop();
    }
  }, [gameState, stop]);

  const value = {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    toggleMute,
    seekTo
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

// Hook personnalisé
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

// Hook combiné pour la gestion audio du jeu
export const useGameAudio = () => {
  const audio = useAudio();
  const { currentRound, config } = useGame();
  
  const playRound = useCallback(async (url: string) => {
    await audio.play(url);
    // Gestion du volume selon la configuration
    const duration = config.duration * 1000;
    const volumeStart = config.volumeStart;
    const volumeEnd = config.volumeEnd;
    
    // Fade progressif du volume
    const fadeInterval = setInterval(() => {
      const elapsed = audio.currentTime * 1000;
      const progress = Math.min(1, elapsed / duration);
      const newVolume = volumeStart + (volumeEnd - volumeStart) * progress;
      audio.setVolume(newVolume);
      
      if (progress >= 1) {
        clearInterval(fadeInterval);
      }
    }, 100);

    return () => clearInterval(fadeInterval);
  }, [audio, config]);

  return {
    ...audio,
    playRound
  };
};