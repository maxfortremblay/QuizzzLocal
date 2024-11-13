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

class SpotifyService {
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
    this.api = SpotifyApi.withAccessToken(token);
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
      this.accessToken = accessToken;
      this.initializeApi(accessToken);
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_expires_at', (Date.now() + parseInt(expiresIn) * 1000).toString());
      return {
        accessToken,
        refreshToken: null,
        expiresAt: Date.now() + parseInt(expiresIn) * 1000
      };
    }
    throw new Error('Invalid auth callback');
  }

  public async searchTracks(query: string): Promise<SpotifyTrack[]> {
    if (!this.api) throw new Error('API not initialized');

    try {
      const response = await this.api.search(query, ['track']);
      return response.tracks.items.map(track => this.convertApiTrackToTrack(track));
    } catch (error) {
      console.error('Erreur recherche Spotify:', error);
      throw this.handleApiError(error);
    }
  }

  private convertApiTrackToTrack(apiTrack: SpotifyApiTrack): SpotifyTrack {
    return {
      id: apiTrack.id,
      name: apiTrack.name,
      artists: apiTrack.artists.map(artist => artist.name).join(', '),
      album: apiTrack.album.name,
      albumCover: apiTrack.album.images[0]?.url,
      previewUrl: apiTrack.preview_url || null,
      spotifyUri: apiTrack.uri,
      year: parseInt(apiTrack.album.release_date.split('-')[0], 10)
    };
  }

  private handleApiError(error: any): SpotifyError {
    return {
      status: error.status || 500,
      message: error.message || 'Unknown error'
    };
  }

  public playPreview(track: SpotifyTrack) {
    if (!track.previewUrl) return;

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.audioElement = new Audio(track.previewUrl);
    this.audioElement.play().catch(error => console.error('Erreur lecture preview:', error));
    this.currentTrack = track;
  }

  public getCurrentTrack(): SpotifyTrack | null {
    return this.currentTrack;
  }
}

export const spotifyService = new SpotifyService();