// Interface officielle de l'API Spotify pour les pistes
export interface SpotifyApiTrack {
  id: string;
  name: string;
  previewUrl: string | null; // Utilisez 'previewUrl' pour cohérence
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  previewUrl: string;
  uri: string;
  year?: string;
}

// Interface simplifiée pour notre application
export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  previewUrl: string;
  spotifyUri: string;
  year?: number;
}

// Authentification Spotify
export interface SpotifyAuth {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

// Gestion des erreurs Spotify
export interface SpotifyError {
  status: number;
  message: string;
}