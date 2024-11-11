import { useState, useCallback, useEffect } from 'react';
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
  const [auth, setAuth] = useState<SpotifyAuth>({
    accessToken: localStorage.getItem('spotify_access_token'),
    refreshToken: localStorage.getItem('spotify_refresh_token'),
    expiresAt: Number(localStorage.getItem('spotify_expires_at')) || null
  });

  const [state, setState] = useState<SpotifyState>({
    isLoading: false,
    error: null,
    volume: 50,
    isPlaying: false
  });

  // Vérification du token
  const isTokenExpired = useCallback(() => {
    return !auth.expiresAt || Date.now() > auth.expiresAt;
  }, [auth.expiresAt]);

  // Recherche de chansons
  const searchTracks = useCallback(async (query: string): Promise<SpotifyTrack[]> => {
    if (!auth.accessToken || isTokenExpired()) {
      throw new Error('Token invalide ou expiré');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${auth.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de recherche');
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
      setState(prev => ({
        ...prev,
        error: { status: 500, message: 'Erreur de recherche' }
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [auth.accessToken, isTokenExpired]);

  // Gestion audio
  const playPreview = useCallback((previewUrl: string) => {
    if (!previewUrl) return;
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pausePreview = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  // Authentification
  const login = useCallback(async () => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      localStorage.setItem('spotify_code_verifier', codeVerifier);
      
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        scope: [
          'streaming',
          'user-read-email',
          'user-read-private',
          'user-modify-playback-state'
        ].join(' ')
      });

      window.location.href = `https://accounts.spotify.com/authorize?${params}`;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: { status: 500, message: 'Erreur d\'authentification' }
      }));
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
  }, []);

  return {
    auth,
    state,
    login,
    logout,
    searchTracks,
    playPreview,
    pausePreview,
    setVolume
  };
};

// Utilitaires pour PKCE
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}