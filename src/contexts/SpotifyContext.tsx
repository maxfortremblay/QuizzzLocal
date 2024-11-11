import React, { createContext, useContext } from 'react';
import { useSpotify } from '../hooks/useSpotify';
import { SpotifyTrack, SpotifyAuth, SpotifyError } from '../types/spotify';

// Interface simplifiée pour le contexte
interface SpotifyContextState {
  isAuthenticated: boolean;
  isLoading: boolean;
  volume: number;
  isPlaying: boolean;
  error: SpotifyError | null;
}

interface SpotifyContextValue {
  // État
  auth: SpotifyAuth;
  state: SpotifyContextState;
  
  // Actions
  login: () => Promise<void>;
  logout: () => void;
  searchTracks: (query: string) => Promise<SpotifyTrack[]>;
  
  // Contrôles audio
  setVolume: (volume: number) => void;
  playPreview: (previewUrl: string) => void;
  pausePreview: () => void;
}

// Création du contexte
const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined);

// Provider avec useSpotify
export const SpotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    auth,
    state,
    login,
    logout,
    searchTracks,
    playPreview,
    pausePreview,
    setVolume
  } = useSpotify({
    clientId: process.env.REACT_APP_SPOTIFY_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/callback`
  });

  // Valeur du contexte
  const value: SpotifyContextValue = {
    auth,
    state: {
      isAuthenticated: Boolean(auth.accessToken),
      isLoading: state.isLoading,
      volume: state.volume,
      isPlaying: state.isPlaying,
      error: state.error
    },
    login,
    logout,
    searchTracks,
    setVolume,
    playPreview,
    pausePreview
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
};

// Hook personnalisé pour accéder au contexte
export const useSpotifyContext = () => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotifyContext doit être utilisé dans un SpotifyProvider');
  }
  return context;
};