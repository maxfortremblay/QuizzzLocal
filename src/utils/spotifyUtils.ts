// src/utils/spotifyUtils.ts
import { SpotifyTrack, SpotifyAuth, SpotifyError, SpotifyApiTrack, Song } from '../types/spotify';

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_ENDPOINT = 'https://api.spotify.com/v1';

/**
 * Génère l'URL d'authentification Spotify
 */
export const generateAuthUrl = (clientId: string, redirectUri: string): string => {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scopes.join(' ')
  });

  return `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
};

/**
 * Échange le code d'autorisation contre un token d'accès
 */
export const exchangeCodeForToken = async (
  code: string,
  clientId: string,
  redirectUri: string
): Promise<SpotifyAuth> => {
  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error('Échec de l\'échange du code');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };
};

/**
 * Rafraîchit le token d'accès
 */
export const refreshAccessToken = async (
  refreshToken: string,
  clientId: string
): Promise<SpotifyAuth> => {
  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error('Échec du rafraîchissement du token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000
  };
};

/**
 * Recherche des pistes sur Spotify
 */
export const searchTracks = async (
  query: string,
  accessToken: string
): Promise<SpotifyTrack[]> => {
  const response = await fetch(
    `${SPOTIFY_API_ENDPOINT}/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=FR`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Échec de la recherche');
  }

  const data = await response.json();
  return data.tracks.items.map(convertApiTrackToTrack);
};

/**
 * Vérifie si une piste a un aperçu valide
 */
export const hasValidPreview = (track: SpotifyTrack): boolean => {
  return Boolean(track.previewUrl);
};

/**
 * Convertit une piste API en piste simplifiée
 */
import { SpotifyApiTrack, SpotifyTrack } from '../types/spotify';

export const convertApiTrackToTrack = (apiTrack: SpotifyApiTrack): SpotifyTrack => ({
  id: apiTrack.id,
  name: apiTrack.name,
  artists: apiTrack.artists.map(a => ({ name: a.name })),
  album: {
    name: apiTrack.album.name,
    images: apiTrack.album.images
  },
  previewUrl: apiTrack.preview_url || '',
  uri: apiTrack.uri,
  year: apiTrack.album.release_date.split('-')[0]
});

/**
 * Convertit une piste Spotify en chanson du jeu
 */
export const convertToSong = (track: SpotifyTrack): Song | null => {
  if (!hasValidPreview(track)) return null;

  const year = track.year ? parseInt(track.year, 10) : undefined;

  return {
    id: track.id,
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '), // Utilisez 'artist' ici
    album: track.album.name,
    year,
    previewUrl: track.previewUrl,
    spotifyUri: track.uri
  };
};

/**
 * Vérifie si une piste est valide pour le jeu
 */
export const isValidSpotifyTrack = (track: SpotifyTrack): boolean => {
  return Boolean(
    track.id &&
    track.name &&
    track.previewUrl &&
    track.artists.length > 0
  );
};