import React, { useState, useEffect, useCallback } from 'react';
import { SpotifyTrack } from './types/spotify';

// Types et interfaces
export interface SpotifyAuth {
  accessToken: string | null;
  expiresAt: number | null;
}

export interface SpotifyState {
  isAuthenticated: boolean;
  currentTrack: any;
  volume: number;
  error: string | null;
}

export interface SpotifySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Hook principal pour la gestion de Spotify
export const useSpotify = () => {
  const [auth, setAuth] = useState<SpotifyAuth>({
    accessToken: localStorage.getItem('spotify_access_token'),
    expiresAt: Number(localStorage.getItem('spotify_expires_at')) || null
  });

  const [state, setState] = useState<SpotifyState>({
    isAuthenticated: Boolean(localStorage.getItem('spotify_access_token')),
    currentTrack: null,
    volume: 50,
    error: null
  });

  const isTokenExpired = useCallback(() => {
    return !auth.expiresAt || Date.now() > auth.expiresAt;
  }, [auth.expiresAt]);

  const login = useCallback(() => {
    const clientId = localStorage.getItem('spotify_client_id');
    const redirectUri = localStorage.getItem('spotify_redirect_uri');

    if (!clientId || !redirectUri) {
      setState(prev => ({
        ...prev,
        error: 'Configuration Spotify manquante'
      }));
      return false;
    }

    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state',
      'user-read-playback-state'
    ].join(' ');

    window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_expires_at');
    setAuth({ accessToken: null, expiresAt: null });
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      currentTrack: null
    }));
  }, []);

  const handleCallback = useCallback(() => {
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce<{ [key: string]: string }>((initial, item) => {
        const parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
        return initial;
      }, {});

    if (hash.access_token) {
      const expiresAt = Date.now() + Number(hash.expires_in) * 1000;
      localStorage.setItem('spotify_access_token', hash.access_token);
      localStorage.setItem('spotify_expires_at', String(expiresAt));

      setAuth({
        accessToken: hash.access_token,
        expiresAt: expiresAt
      });

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        error: null
      }));

      window.location.hash = '';
      return true;
    }
    return false;
  }, []);

  const searchTracks = useCallback(async (query: string): Promise<SpotifyTrack[]> => {
    if (!query.trim() || !auth.accessToken || isTokenExpired()) {
      if (isTokenExpired()) {
        logout();
      }
      return [];
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          logout();
        }
        throw new Error('Erreur API Spotify');
      }

      const data = await response.json();
      
      return data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        previewUrl: track.preview_url,
        spotifyUri: track.uri,
        year: track.album.release_date ? new Date(track.album.release_date).getFullYear() : undefined
      }));
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setState(prev => ({
        ...prev,
        error: 'Erreur lors de la recherche'
      }));
      return [];
    }
  }, [auth.accessToken, isTokenExpired, logout]);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({
      ...prev,
      volume
    }));
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      handleCallback();
    }
  }, [handleCallback]);

  return {
    auth,
    state,
    login,
    logout,
    searchTracks,
    isTokenExpired,
    setVolume
  };
};

// Hook de recherche avec debounce
export const useSpotifySearch = (spotify: ReturnType<typeof useSpotify>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const debounceTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const tracks = await spotify.searchTracks(searchTerm);
        setResults(tracks);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, spotify]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching
  };
};

// Composant de configuration Spotify
export const SpotifySettings: React.FC<SpotifySettingsProps> = ({ isOpen, onClose }) => {
  const [clientId, setClientId] = useState(
    localStorage.getItem('spotify_client_id') || ''
  );
  const [redirectUri, setRedirectUri] = useState(
    localStorage.getItem('spotify_redirect_uri') || window.location.origin
  );

  const handleSave = () => {
    localStorage.setItem('spotify_client_id', clientId);
    localStorage.setItem('spotify_redirect_uri', redirectUri);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md p-6 bg-white rounded-xl">
        <h3 className="mb-4 text-lg font-bold">Configuration Spotify</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Votre Client ID Spotify"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              URI de redirection
            </label>
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="http://localhost:3000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};