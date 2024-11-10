// src/contexts/SpotifyContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
interface SpotifyState {
  isAuthenticated: boolean;
  volume: number;
  currentTrack?: string;
}

interface SpotifyContextType {
  state: SpotifyState;
  login: () => Promise<void>;
  logout: () => void;
  setVolume: (volume: number) => void;
}

// État initial
const initialState: SpotifyState = {
  isAuthenticated: false,
  volume: 50,
  currentTrack: undefined
};

// Création du contexte
const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

// Provider
export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SpotifyState>(initialState);

  const login = async () => {
    setState(prev => ({ ...prev, isAuthenticated: true }));
  };

  const logout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
  };

  const setVolume = (volume: number) => {
    setState(prev => ({ ...prev, volume }));
  };

  const value = {
    state,
    login,
    logout,
    setVolume
  };

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  );
};

// Hook personnalisé
export const useSpotifyContext = () => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotifyContext doit être utilisé dans un SpotifyProvider");
  }
  return context;