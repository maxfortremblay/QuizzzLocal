import { useState, useCallback, useEffect, useRef } from 'react';
import { SpotifyTrack, SpotifyAuth, SpotifyError } from '../types/spotify';

interface UseSpotifyOptions {
  clientId: string;
  redirectUri: string;
}

interface SpotifyState {
  isLoading: boolean;
  error: SpotifyError | null;
  volume: number;
  isPlaying: boolean;
}

export const useSpotify = ({ clientId, redirectUri }: UseSpotifyOptions) => {
  const [auth, setAuth] = useState<SpotifyAuth>(() => ({
    accessToken: localStorage.getItem('spotify_access_token'),
    refreshToken: localStorage.getItem('spotify_refresh_token'),
    expiresAt: Number(localStorage.getItem('spotify_expires_at')) || null
  }));

  const [state, setState] = useState<SpotifyState>({
    isLoading: false,
    error: null,
    volume: 50,
    isPlaying: false
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vérification du token
  const isTokenExpired = useCallback(() => {
    const expiresAt = localStorage.getItem('spotify_expires_at');
    return !expiresAt || Date.now() > Number(expiresAt);
  }, []);

  // Login avec Promise
  const login = useCallback(async (): Promise<void> => {
    try {
      const storedClientId = localStorage.getItem('spotify_client_id');
      if (!storedClientId) {
        throw new Error('Client ID manquant');
      }

      const scopes = [
        'user-read-private',
        'user-read-email',
        'streaming',
        'user-modify-playback-state'
      ].join(' ');

      const params = new URLSearchParams({
        client_id: storedClientId,
        response_type: 'token',
        redirect_uri: `${window.location.origin}/callback`,
        scope: scopes
      });

      window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
      return Promise.resolve();
    } catch (error) {
      console.error('Erreur de login:', error);
      setState(prev => ({
        ...prev,
        error: { 
          status: 500, 
          message: error instanceof Error ? error.message : 'Erreur de connexion'
        }
      }));
      return Promise.reject(error);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_expires_at');
    localStorage.removeItem('spotify_refresh_token');
    
    setAuth({
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    });
    
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Recherche de pistes
  const searchTracks = useCallback(async (query: string): Promise<SpotifyTrack[]> => {
    const accessToken = localStorage.getItem('spotify_access_token');
    
    if (!accessToken) {
      console.error('Pas de token d\'accès');
      throw new Error('Veuillez vous connecter à Spotify');
    }

    if (isTokenExpired()) {
      console.error('Token expiré');
      login(); // Redirection vers la connexion si token expiré
      throw new Error('Session expirée, reconnexion nécessaire');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      
      return data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        previewUrl: track.preview_url,
        spotifyUri: track.uri,
        year: new Date(track.album.release_date).getFullYear()
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setState(prev => ({
        ...prev,
        error: { 
          status: 500, 
          message: error instanceof Error ? error.message : 'Erreur de recherche'
        }
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isTokenExpired, login]);

  // Gestion du volume
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, []);

  // Lecture preview
  const playPreview = useCallback((previewUrl: string) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      audioRef.current.src = previewUrl;
      audioRef.current.volume = state.volume / 100;
      
      audioRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
      }).catch(error => {
        console.error('Erreur de lecture:', error);
        setState(prev => ({
          ...prev,
          error: { status: 500, message: 'Erreur de lecture audio' }
        }));
      });
    } catch (error) {
      console.error('Erreur de configuration audio:', error);
    }
  }, [state.volume]);

  // Pause preview
  const pausePreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Gestion du callback d'authentification
  useEffect(() => {
    const handleCallback = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');

      if (accessToken && expiresIn) {
        const expiresAt = Date.now() + Number(expiresIn) * 1000;
        
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_expires_at', String(expiresAt));

        setAuth(prev => ({
          ...prev,
          accessToken,
          expiresAt
        }));

        // Nettoyer l'URL
        window.history.pushState("", "", window.location.pathname);
      }
    };

    if (window.location.hash) {
      handleCallback();
    }
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    auth,
    state,
    login,
    logout,
    searchTracks,
    playPreview,
    pausePreview,
    setVolume,
    isTokenExpired
  };
};