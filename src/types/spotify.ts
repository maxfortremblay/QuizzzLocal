// Interface de piste Spotify depuis l'API
export interface SpotifyTrack {
  id: string;
  name: string; 
  artist: string;
  album: string;
  previewUrl: string | null; 
  spotifyUri: string;
  year?: number;
}

// Interface Song utilisée dans le jeu
export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  previewUrl: string; // Version non nullable pour le jeu
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