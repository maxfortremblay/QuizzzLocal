import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SpotifyTrack, SpotifyAuth, SpotifyError, SpotifyApiTrack, Song } from '../types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const REQUIRED_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');

export class SpotifyService {
  private accessToken: string | null = null;
  private api: SpotifyApi | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: SpotifyTrack | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    if (this.accessToken) {
      this.initializeApi(this.accessToken);
    }
  }

  private initializeApi(token: string) {
    this.api = SpotifyApi.withAccessToken(token, {
      baseUrl: SPOTIFY_API_BASE
    });
  }

  public getAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES
    });

    return `${AUTH_ENDPOINT}?${params.toString()}`;
  }

  public handleAuthCallback(hash: string): SpotifyAuth {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (accessToken && expiresIn) {
      const expiresAt = Date.now() + parseInt(expiresIn) * 1000;
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_expires_at', expiresAt.toString());
      
      this.accessToken = accessToken;
      this.initializeApi(accessToken);

      return {
        accessToken,
        refreshToken: null,
        expiresAt
      };
    }

    throw new Error('Authentification échouée');
  }

  public async searchTracks(query: string): Promise<SpotifyTrack[]> {
    if (!this.api) throw new Error('API non initialisée');

    try {
      const response = await this.api.search(query, ['track'], 'FR', 10);
      
      return response.tracks.items.map(track => this.convertApiTrackToTrack(track));
    } catch (error) {
      console.error('Erreur recherche Spotify:', error);
      throw this.handleApiError(error);
    }
  }

  public async getTrack(id: string): Promise<SpotifyTrack> {
    if (!this.api) throw new Error('API non initialisée');

    try {
      const track = await this.api.tracks.get(id);
      
      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        albumCover: track.album.images[0]?.url,
        previewUrl: track.preview_url,
        spotifyUri: track.uri,
        year: new Date(track.album.release_date).getFullYear()
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  public async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    if (!this.api) throw new Error('API non initialisée');

    try {
      const response = await this.api.playlists.getPlaylistItems(playlistId);
      
      return response.items
        .map(item => item.track)
        .filter(track => track.type === 'track')
        .map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          albumCover: track.album.images[0]?.url,
          previewUrl: track.preview_url,
          spotifyUri: track.uri,
          year: new Date(track.album.release_date).getFullYear()
        }));
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  public playPreview(track: SpotifyTrack): void {
    if (!track.previewUrl) return;

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.audioElement = new Audio(track.previewUrl);
    this.audioElement.play();
    this.currentTrack = track;
  }

  public pausePreview(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.currentTrack = null;
    }
  }

  public setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }

  public getCurrentTrack(): SpotifyTrack | null {
    return this.currentTrack;
  }

  public logout(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_expires_at');
    this.accessToken = null;
    this.api = null;
    this.pausePreview();
  }

  public isAuthenticated(): boolean {
    const expiresAt = localStorage.getItem('spotify_expires_at');
    return Boolean(
      this.accessToken && 
      expiresAt && 
      Date.now() < parseInt(expiresAt)
    );
  }

  private handleApiError(error: any): SpotifyError {
    if (error.status === 401) {
      this.logout();
      return {
        status: 401,
        message: 'Session expirée, veuillez vous reconnecter'
      };
    }

    return {
      status: error.status || 500,
      message: error.message || 'Erreur inattendue'
    };
  }

  private convertApiTrackToTrack(apiTrack: SpotifyApiTrack): SpotifyTrack {
    return {
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
    };
  }
}

export const spotifyService = new SpotifyService();