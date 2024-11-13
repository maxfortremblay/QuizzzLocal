import { useState, useCallback, useEffect, useRef } from 'react';
import { SpotifyTrack, SpotifyAuth, SpotifyError } from '../types/spotify';
import {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  searchTracks as spotifySearch,
  hasValidPreview
} from '../utils/spotifyUtils';

interface UseSpotifyOptions {
  clientId: string;
  redirectUri: string;
}

interface SpotifyState {
  isLoading: boolean;
  error: SpotifyError | null;
  volume: number;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
}

export const useSpotify = ({ clientId, redirectUri }: UseSpotifyOptions) => {
  const [auth, setAuth] = useState<SpotifyAuth>({
    accessToken: localStorage.getItem('spotify_access_token'),
    refreshToken: localStorage.getItem('spotify_refresh_token'),
    expiresAt: Number(localStorage.getItem('spotify_expires_at')) || null
  });

  const [state, setState] = useState<SpotifyState>({
    isLoading: false,
    error: null,
    volume: 50,
    isPlaying: false,
    currentTrack: null
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isAuthenticated = useCallback(() => {
    return Boolean(
      auth.accessToken && 
      auth.expiresAt && 
      Date.now() < auth.expiresAt
    );
  }, [auth]);

  useEffect(() => {
    if (!auth.refreshToken || !auth.expiresAt) return;

    const timeUntilExpiry = auth.expiresAt - Date.now();
    if (timeUntilExpiry <= 0) return;

    const refreshTimer = setTimeout(async () => {
      try {
        const newAuth = await refreshAccessToken(auth.refreshToken!, clientId);
        setAuth(newAuth);
        
        localStorage.setItem('spotify_access_token', newAuth.accessToken!);
        localStorage.setItem('spotify_refresh_token', newAuth.refreshToken!);
        localStorage.setItem('spotify_expires_at', newAuth.expiresAt!.toString());
      } catch (error) {
        handleError(error);
      }
    }, timeUntilExpiry - 60000);

    return () => clearTimeout(refreshTimer);
  }, [auth, clientId]);

  const handleError = useCallback((error: unknown) => {
    const spotifyError: SpotifyError = {
      status: error instanceof Error ? 500 : 400,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    };
    setState(prev => ({ ...prev, error: spotifyError }));
  }, []);

  const login = useCallback(async () => {
    try {
      const authUrl = await generateAuthUrl(clientId, redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      handleError(error);
    }
  }, [clientId, redirectUri]);

  const handleCallback = useCallback(async (code: string) => {
    try {
      const newAuth = await exchangeCodeForToken(code, clientId, redirectUri);
      setAuth(newAuth);
      
      localStorage.setItem('spotify_access_token', newAuth.accessToken!);
      localStorage.setItem('spotify_refresh_token', newAuth.refreshToken!);
      localStorage.setItem('spotify_expires_at', newAuth.expiresAt!.toString());

      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }, [clientId, redirectUri]);

  const logout = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
    
    setAuth({
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    });

    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const searchTracks = useCallback(async (query: string): Promise<SpotifyTrack[]> => {
    if (!isAuthenticated()) {
      throw new Error('Non authentifié');
    }

    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const tracks = await spotifySearch(query, auth.accessToken!);
      return tracks.filter(hasValidPreview);
    } catch (error) {
      handleError(error);
      return [];
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [auth.accessToken, isAuthenticated]);

  const playPreview = useCallback((track: SpotifyTrack) => {
    if (!track.previewUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.previewUrl);
    audio.volume = state.volume / 100;
    
    audio.play().catch(handleError);
    audioRef.current = audio;
    
    setState(prev => ({ 
      ...prev, 
      isPlaying: true,
      currentTrack: track
    }));
  }, [state.volume]);

  const pausePreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    auth,
    state,
    isAuthenticated: isAuthenticated(),
    login,
    handleCallback,
    logout,
    searchTracks,
    playPreview,
    pausePreview,
    setVolume
  };
};