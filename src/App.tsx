/**
 * Quiz Musical - Application principale
 * Structure complète de l'application en un fichier unique
 * 
 * Fonctionnalités :
 * - Gestion des équipes
 * - Configuration du jeu
 * - Lecture audio Spotify
 * - Système de points et bonus
 * - Navigation entre les différentes vues
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Music2, Play, Pause, Clock, Check, X, ChevronRight, 
  Settings, Star, Users, Plus, AlertCircle, Search,
  Trophy, ArrowLeft, Volume2, VolumeX, ExternalLink
} from 'lucide-react';

// Types et interfaces
interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  members: string[];
}

interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  previewUrl: string;
  fallbackUrls?: {
    mp3?: string;
    wav?: string;
  };
  duration: number;
  spotifyUrl?: string;
  spotifyId?: string;
  spotifyUri?: string;
  isSpotify?: boolean;
  albumArt?: string; // Nouvelle propriété
}

interface GameConfig {
  roundDuration: number;
  bonuses: {
    albumName: boolean;
    releaseYear: boolean;
  };
  basePoints: number;
  bonusTimePoints: number;
  totalRounds: number;
}

type GameState = 'home' | 'preparation' | 'playing' | 'reveal' | 'finished';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
  method: 'sdk' | 'api';
}

interface SpotifyState {
  isAuthenticated: boolean;
  deviceId: string | null;
  error: string | null;
  volume: number;
}

declare global {
  interface Window {
    Spotify: any;
  }
}

const App = () => {
    // ===============================================
    // ÉTATS PRINCIPAUX
    // ===============================================
    
    /**
     * État général du jeu
     * - home: Page d'accueil avec gestion des équipes
     * - preparation: Configuration et playlists
     * - playing: Jeu en cours
     * - finished: Écran des scores finaux
     */
    const [gameState, setGameState] = useState<GameState>('home');
    
    /**
     * Gestion des équipes et scores
     * Sauvegardé localement pour persistance
     */
    const [teams, setTeams] = useState<Team[]>([]);
    
    /**
     * Configuration du jeu
     * Paramètres et bonus activés
     */
    const [gameConfig, setGameConfig] = useState<GameConfig>({
      roundDuration: 30,
      bonuses: {
        albumName: true,
        releaseYear: true
      },
      basePoints: 100,
      bonusTimePoints: 10,
      totalRounds: 10
    });
  
    // ===============================================
    // ÉTATS DU JEU
    // ===============================================
    
    /**
     * État de la partie en cours
     */
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(gameConfig.roundDuration);
    const [countdown, setCountdown] = useState(3);
    const [currentRound, setCurrentRound] = useState(1);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [bonusSelections, setBonusSelections] = useState<string[]>([]);
    const [roundComplete, setRoundComplete] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
  
    // ===============================================
    // GESTION AUDIO
    // ===============================================
    
    const audioRef = useRef(new Audio());
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const audioCache = useRef<{[key: string]: HTMLAudioElement}>({});
    const [audioError, setAudioError] = useState<string | null>(null);
  
    // Nouveaux états pour Spotify
    const [spotifyConfig, setSpotifyConfig] = useState<SpotifyConfig>(() => ({
      clientId: localStorage.getItem('spotify_client_id') || '',
      redirectUri: localStorage.getItem('spotify_redirect_uri') || window.location.origin,
      method: (localStorage.getItem('spotify_method') as SpotifyConfig['method']) || 'sdk'
    }));

    const [spotifyState, setSpotifyState] = useState<SpotifyState>({
      isAuthenticated: false,
      deviceId: null,
      error: null,
      volume: 50
    });

    const [isSpotifyConfigOpen, setIsSpotifyConfigOpen] = useState(false);
    const spotifyPlayer = useRef<any>(null);
    const [spotifyToken, setSpotifyToken] = useState<string | null>(
      localStorage.getItem('spotify_token')
    );
  
    // ===============================================
    // EFFETS
    // ===============================================
  
    /**
     * Chargement initial des données sauvegardées
     */
    useEffect(() => {
      const savedTeams = localStorage.getItem('quizTeams');
      const savedConfig = localStorage.getItem('quizConfig');
      const savedSongs = localStorage.getItem('quizSongs');
      
      if (savedTeams) setTeams(JSON.parse(savedTeams));
      if (savedConfig) setGameConfig(JSON.parse(savedConfig));
      if (savedSongs) setSongs(JSON.parse(savedSongs));
    }, []);
  
    /**
     * Sauvegarde automatique des données
     */
    useEffect(() => {
      if (teams.length > 0) {
        localStorage.setItem('quizTeams', JSON.stringify(teams));
      }
      if (songs.length > 0) {
        localStorage.setItem('quizSongs', JSON.stringify(songs));
      }
      localStorage.setItem('quizConfig', JSON.stringify(gameConfig));
    }, [teams, songs, gameConfig]);
  
    /**
     * Gestion de la lecture audio
     */
    useEffect(() => {
      if (gameState === 'playing' && songs[currentSongIndex]?.previewUrl) {
        audioRef.current.src = songs[currentSongIndex].previewUrl;
        audioRef.current.load();
        
        const handleCanPlay = () => setAudioLoaded(true);
        audioRef.current.addEventListener('canplaythrough', handleCanPlay);
  
        return () => {
          audioRef.current.removeEventListener('canplaythrough', handleCanPlay);
          audioRef.current.pause();
        };
      }
    }, [gameState, currentSongIndex, songs]);
  
    /**
     * Timer de jeu et décompte
     */
    useEffect(() => {
      let timer: NodeJS.Timeout;
      
      if (gameState === 'playing') {
        if (countdown > 0) {
          timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        } else if (timeLeft > 0 && isPlaying) {
          timer = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                audioRef.current.pause();
                setIsPlaying(false);
                setRoundComplete(true);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
  
      return () => clearInterval(timer);
    }, [gameState, countdown, timeLeft, isPlaying]);

    useEffect(() => {
      if (timeLeft === 0 && gameState === 'playing') {
        audioRef.current?.pause();
        setIsPlaying(false);
        setGameState('reveal');
      }
    }, [timeLeft, gameState]);

    // Initialisation du SDK Spotify
    useEffect(() => {
      if (spotifyConfig.method !== 'sdk' || !spotifyToken) return;
  
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
  
      document.body.appendChild(script);
  
      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        const player = new window.Spotify.Player({
          name: 'Quiz Musical',
          getOAuthToken: (cb: (token: string) => void) => { cb(spotifyToken); },
          volume: spotifyState.volume / 100
        });
  
        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('Ready with Device ID', device_id);
          setSpotifyState(prev => ({
            ...prev,
            deviceId: device_id,
            isAuthenticated: true
          }));
        });
  
        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline', device_id);
        });
  
        player.connect();
        spotifyPlayer.current = player;
      };
  
      return () => {
        script.remove();
        spotifyPlayer.current?.disconnect();
      };
    }, [spotifyToken, spotifyConfig.method, spotifyState.volume]);
  
    // Gestion de l'authentification Spotify
    useEffect(() => {
      const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial: { [key: string]: string }, item) => {
          const parts = item.split('=');
          initial[parts[0]] = decodeURIComponent(parts[1]);
          return initial;
        }, {});
  
      if (hash.access_token) {
        const token = hash.access_token;
        setSpotifyToken(token);
        localStorage.setItem('spotify_token', token);
        window.location.hash = '';
        setSpotifyState(prev => ({
          ...prev,
          isAuthenticated: true
        }));
      }
    }, []);
  
    // ===============================================
    // FONCTIONS UTILITAIRES
    // ===============================================
  
    /**
     * Ajoute une nouvelle équipe au jeu
     */
    const addTeam = (name: string) => {
      if (teams.length >= 4) return;
      
      setTeams(prev => [...prev, {
        id: Date.now().toString(),
        name,
        color: `bg-gradient-to-r from-purple-${500 + teams.length * 100} to-pink-${500 + teams.length * 100}`,
        score: 0,
        members: []
      }]);
    };
  
    /**
     * Supprime une équipe du jeu
     */
    const removeTeam = (teamId: string) => {
      setTeams(prev => prev.filter(team => team.id !== teamId));
    };
  
    /**
     * Commence une nouvelle partie
     */
    const startGame = () => {
      setGameState('playing');
      setCurrentRound(1);
      setCurrentSongIndex(0);
      setTimeLeft(gameConfig.roundDuration);
      setCountdown(3);
      setIsPlaying(false);
      setRoundComplete(false);
      setTeams(prev => prev.map(team => ({ ...team, score: 0 })));
    };
  
    /**
     * Passe à la question suivante
     */
    const nextRound = () => {
      if (currentRound >= gameConfig.totalRounds) {
        setGameState('finished');
        return;
      }
  
      setCurrentRound(prev => prev + 1);
      setCurrentSongIndex(prev => prev + 1);
      setTimeLeft(gameConfig.roundDuration);
      setCountdown(3);
      setIsPlaying(false);
      setRoundComplete(false);
      setSelectedTeam(null);
      setBonusSelections([]);
    };
  
    /**
     * Calcule le score en fonction du temps et des bonus
     */
    const calculateScore = (timeRemaining: number, bonuses: string[]) => {
      let score = gameConfig.basePoints + (timeRemaining * gameConfig.bonusTimePoints);
      
      bonuses.forEach(bonus => {
        if (bonus === 'albumName') score += 25;
        if (bonus === 'releaseYear') score += 50;
      });
  
      return score;
    };
  
    /**
     * Met à jour le score d'une équipe
     */
    const updateScore = (teamId: string, points: number) => {
      setTeams(prev => 
        prev.map(team => 
          team.id === teamId
            ? { ...team, score: team.score + points }
            : team
        )
      );
    };

    const showNotification = useCallback((
      message: string,
      type: Notification['type'] = 'info',
      duration = 5000
    ) => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, { id, type, message, duration }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
      }, duration);
    }, []);
  
    const success = useCallback((message: string) => 
      showNotification(message, 'success'), [showNotification]);
    
    const error = useCallback((message: string) => 
      showNotification(message, 'error'), [showNotification]);
    
    const info = useCallback((message: string) => 
      showNotification(message, 'info'), [showNotification]);
  
    const getCompatibleAudioUrl = useCallback((song: Song): string => {
      if (audioRef.current.canPlayType('audio/mpeg') && song.fallbackUrls?.mp3) {
        return song.fallbackUrls.mp3;
      }
      if (audioRef.current.canPlayType('audio/wav') && song.fallbackUrls?.wav) {
        return song.fallbackUrls.wav;
      }
      return song.previewUrl;
    }, []);

    const preloadAudio = useCallback(async (url: string): Promise<HTMLAudioElement> => {
      if (audioCache.current[url]) {
        return audioCache.current[url];
      }
  
      const audio = new Audio();
      audio.preload = 'auto';
      
      return new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => {
          audioCache.current[url] = audio;
          resolve(audio);
        }, { once: true });
  
        audio.addEventListener('error', () => {
          reject(new Error('Erreur de chargement audio'));
        }, { once: true });
  
        audio.src = url;
        audio.load();
      });
    }, []);
  

    const handleSpotifyLogin = useCallback(() => {
      if (!spotifyConfig.clientId) {
        setSpotifyState(prev => ({
          ...prev,
          error: 'Configuration Spotify manquante'
        }));
        setIsSpotifyConfigOpen(true);
        return;
      }
  
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-modify-playback-state',
        'user-read-playback-state'
      ];
  
      const url = `https://accounts.spotify.com/authorize?client_id=${spotifyConfig.clientId}&response_type=token&redirect_uri=${encodeURIComponent(spotifyConfig.redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
      
      window.location.href = url;
    }, [spotifyConfig]);
  
    const handleSpotifyLogout = useCallback(() => {
      localStorage.removeItem('spotify_token');
      setSpotifyToken(null);
      setSpotifyState(prev => ({
        ...prev,
        isAuthenticated: false,
        deviceId: null
      }));
      spotifyPlayer.current?.disconnect();
    }, []);
  
    const searchSpotify = async (query: string) => {
      if (!spotifyToken || !query.trim()) return;
  
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${spotifyToken}`
            }
          }
        );
  
        if (!response.ok) {
          throw new Error('Erreur de recherche Spotify');
        }
  
        const data = await response.json();
        return data.tracks.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          previewUrl: track.preview_url,
          spotifyUri: track.uri,
          isSpotify: true,
          albumArt: track.album.images[0]?.url // Ajout de l'artwork
        }));
      } catch (error) {
        console.error('Spotify search error:', error);
        setSpotifyState(prev => ({
          ...prev,
          error: 'Erreur de recherche Spotify'
        }));
        return [];
      }
    };

    const handleSongPlay = async () => {
      const currentSong = songs[currentSongIndex];
      if (!currentSong) {
        setAudioError("Aucune chanson sélectionnée");
        return;
      }
    
      try {
        if (isPlaying) {
          // Arrêter la lecture
          if (currentSong.isSpotify && spotifyPlayer.current) {
            await spotifyPlayer.current.pause();
          } else if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
        } else {
          // Démarrer la lecture
          if (currentSong.isSpotify) {
            if (!spotifyState.isAuthenticated) {
              setAudioError("Veuillez vous connecter à Spotify");
              return;
            }
    
            if (spotifyConfig.method === 'sdk' && spotifyPlayer.current) {
              await spotifyPlayer.current.resume();
              // Si nouveau morceau, le charger d'abord
              if (currentSong.spotifyUri) {
                await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyState.deviceId}`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${spotifyToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    uris: [currentSong.spotifyUri]
                  })
                });
              }
            } else {
              // Utiliser l'API Web pour la lecture
              const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${spotifyToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  uris: [currentSong.spotifyUri]
                })
              });
    
              if (!response.ok) {
                throw new Error('Erreur de lecture Spotify');
              }
            }
          } else {
            // Lecture locale
            if (!audioRef.current) {
              audioRef.current = new Audio();
            }
            audioRef.current.src = currentSong.previewUrl;
            audioRef.current.volume = 0.5; // Volume à 50%
            
            try {
              await audioRef.current.play();
            } catch (error) {
              console.error('Erreur de lecture locale:', error);
              setAudioError("Erreur lors de la lecture audio");
              return;
            }
          }
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Playback error:', error);
        setAudioError("Erreur lors de la lecture");
        setIsPlaying(false);
      }
    };
    
    // Ajouter un effet pour la gestion de la fin de lecture
    useEffect(() => {
      if (audioRef.current) {
        const handleEnded = () => {
          setIsPlaying(false);
          if (gameState === 'playing') {
            setGameState('reveal');
          }
        };
    
        audioRef.current.addEventListener('ended', handleEnded);
        return () => {
          audioRef.current?.removeEventListener('ended', handleEnded);
        };
      }
    }, [gameState]);
  
    useEffect(() => {
      if (gameState === 'playing' && songs[currentSongIndex]?.previewUrl) {
        handleSongPlay();
      }
    }, [gameState, currentSongIndex, songs, handleSongPlay]);
  
    const NotificationDisplay = () => (
      <div className="fixed bottom-0 right-0 p-4 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg shadow-lg text-white ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'info' ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>
    );

    const SpotifyConfigModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg p-6 mx-4 space-y-6 bg-white shadow-xl rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Configuration Spotify</h2>
            <button
              onClick={() => setIsSpotifyConfigOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
  
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Méthode de lecture
              </label>
              <select
                value={spotifyConfig.method}
                onChange={(e) => setSpotifyConfig(prev => ({
                  ...prev,
                  method: e.target.value as SpotifyConfig['method']
                }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="sdk">Web Playback SDK (compte Premium requis)</option>
                <option value="api">API Web (compte gratuit)</option>
              </select>
            </div>
  
            <div>
              <label className="block mb-1 text-sm font-medium">
                Client ID
              </label>
              <input
                type="text"
                value={spotifyConfig.clientId}
                onChange={(e) => setSpotifyConfig(prev => ({
                  ...prev,
                  clientId: e.target.value
                }))}
                placeholder="Votre Client ID Spotify"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
  
            <div>
              <label className="block mb-1 text-sm font-medium">
                URI de redirection
              </label>
              <input
                type="text"
                value={spotifyConfig.redirectUri}
                onChange={(e) => setSpotifyConfig(prev => ({
                  ...prev,
                  redirectUri: e.target.value
                }))}
                placeholder="URI de redirection"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
  
            <div className="p-4 rounded-lg bg-blue-50">
              <h3 className="font-medium text-blue-800">Guide rapide</h3>
              <ol className="mt-2 space-y-1 text-sm text-blue-700 list-decimal list-inside">
                <li>Créez une app sur developers.spotify.com</li>
                <li>Copiez le Client ID</li>
                <li>Ajoutez l'URI de redirection dans les paramètres</li>
                <li>Sauvegardez ici et connectez-vous</li>
              </ol>
            </div>
          </div>
  
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsSpotifyConfigOpen(false)}
              className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                localStorage.setItem('spotify_client_id', spotifyConfig.clientId);
                localStorage.setItem('spotify_redirect_uri', spotifyConfig.redirectUri);
                localStorage.setItem('spotify_method', spotifyConfig.method);
                setIsSpotifyConfigOpen(false);
              }}
              className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  
    // ===============================================
    // COMPOSANTS DE VUE
    // ===============================================
  
    /**
     * Vue de la page d'accueil
     * Gestion des équipes et démarrage du jeu
     */
    const HomeView = () => (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête */}
          <div className="text-center">
            <h1 className="text-6xl font-bold">
              <span className="text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
                Quiz Party
              </span>
            </h1>
          </div>
  
          {/* Gestion des équipes */}
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6 border-b">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Users className="w-5 h-5" />
                Équipes
              </h2>
            </div>
  
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${team.color} flex items-center justify-center text-white font-bold`}>
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          <p className="text-sm text-gray-500">
                            {team.members.length} membres
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTeam(team.id)}
                        className="p-2 text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
  
                {teams.length < 4 && (
                  <button
                    onClick={() => {
                      const name = prompt('Nom de l\'équipe');
                      if (name) addTeam(name);
                    }}
                    className="flex items-center justify-center h-40 gap-2 text-gray-500 transition-colors border-2 border-gray-200 border-dashed bg-gray-50 rounded-xl hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une équipe
                  </button>
                )}
              </div>
            </div>
          </div>
  
          {/* Actions */}
          <button
            onClick={() => setGameState('preparation')}
            disabled={teams.length < 2}
            className="flex items-center justify-center w-full gap-2 p-4 text-lg font-bold text-white shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-6 h-6" />
            Préparer la partie
          </button>
        </div>
      </div>
    );
  
    
  /**
   * Vue de préparation
   * Configuration du jeu et sélection des playlists
   */
  const PreparationView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchSpotify(query);
      setSearchResults(results || []);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl p-8 mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Préparation de la partie</h2>
          <button
            onClick={() => setGameState('home')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Section Spotify */}
        <div className="p-6 space-y-6 bg-white shadow-lg rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music2 className="w-5 h-5" />
              <h3 className="font-semibold">Recherche Spotify</h3>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher une chanson..."
              className="w-full px-4 py-2 pl-10 border rounded-lg"
            />
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-4 transition-shadow bg-white shadow rounded-xl hover:shadow-md"
                >
                  {/* Artwork miniature */}
                  <div className="w-16 h-16 overflow-hidden rounded shrink-0">
                    {track.albumArt ? (
                      <img 
                        src={track.albumArt} 
                        alt={`Album ${track.album}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-100 to-pink-100">
                        <Music2 className="w-6 h-6 text-purple-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{track.name}</div>
                    <div className="text-sm text-gray-500 truncate">{track.artist}</div>
                  </div>

                  <button
                    onClick={() => setSongs(prev => [...prev, track])}
                    className="p-2 text-purple-600 rounded-lg shrink-0 hover:bg-purple-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste des chansons sélectionnées */}
        <div className="p-6 space-y-6 bg-white shadow-lg rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music2 className="w-5 h-5" />
              <h3 className="font-semibold">Playlist du quiz</h3>
            </div>
          </div>

          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <div className="font-medium">{song.name}</div>
                  <div className="text-sm text-gray-500">{song.artist}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">#{index + 1}</span>
                  <button
                    onClick={() => setSongs(prev => prev.filter(s => s.id !== song.id))}
                    className="p-2 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton de démarrage */}
        <button
          onClick={startGame}
          disabled={songs.length < gameConfig.totalRounds}
          className="flex items-center justify-center w-full gap-2 p-4 text-lg font-bold text-white shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-6 h-6" />
          Commencer la partie
        </button>
      </div>
    </div>
  );
};

  /**
   * Vue du jeu en cours
   * Lecture de la musique et validation des réponses
   */
  const GameView = () => {
    // Si on est en décompte initial
    if (countdown > 0) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <div className="relative">
            <div className="absolute inset-0 -m-8 rounded-full bg-white/20 animate-pulse" />
            <div className="relative flex items-center justify-center w-48 h-48 bg-white rounded-full">
              <span className="font-bold text-transparent text-8xl bg-clip-text bg-gradient-to-br from-purple-600 to-pink-600">
                {countdown}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Timer en haut */}
        <div className="fixed top-0 left-0 right-0 h-2 bg-gray-200">
          <div 
            className="h-full transition-all duration-1000 ease-linear bg-gradient-to-r from-purple-500 to-pink-500"
            style={{ width: `${(timeLeft / gameConfig.roundDuration) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Info de la partie */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Round {currentRound}/{gameConfig.totalRounds}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold">{timeLeft}s</span>
              </div>
            </div>

            {/* Zone de lecture */}
            <div className="relative flex items-center justify-center bg-white shadow-lg aspect-square rounded-xl group">
              <Music2 className="w-24 h-24 text-gray-300" />
              
              <button
                onClick={handleSongPlay}
                className="absolute inset-0 flex items-center justify-center transition-colors bg-black/0 hover:bg-black/10"
                disabled={!audioLoaded && !spotifyState.isAuthenticated}
              >
                {isPlaying ? (
                  <Pause className="w-16 h-16 text-white transition-opacity opacity-0 group-hover:opacity-100" />
                ) : (
                  <Play className="w-16 h-16 text-white transition-opacity opacity-0 group-hover:opacity-100" />
                )}
              </button>
      
              {/* Indicateur de chargement */}
              {!audioLoaded && !spotifyState.isAuthenticated && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="w-8 h-8 border-4 border-purple-500 rounded-full animate-spin border-t-transparent" />
                </div>
              )}
            </div>
      
            {/* Message d'erreur */}
            {audioError && (
              <div className="mt-2 text-center text-red-500">
                {audioError}
              </div>
            )}
            
            {/* Équipes et validation */}
            <div className="grid grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} className="p-4 bg-white shadow rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full ${team.color} flex items-center justify-center text-white font-bold`}>
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-sm text-gray-500">{team.score} pts</p>
                      </div>
                    </div>
                  </div>

                  {!roundComplete && (
                    <button
                      onClick={() => {
                        const score = calculateScore(timeLeft, []);
                        updateScore(team.id, score);
                        setRoundComplete(true);
                        audioRef.current.pause();
                        setIsPlaying(false);
                      }}
                      className="w-full py-2 text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200"
                    >
                      Bonne réponse !
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Actions de fin de round */}
            {roundComplete && (
              <div className="flex justify-end">
                <button
                  onClick={currentRound >= gameConfig.totalRounds ? () => setGameState('finished') : nextRound}
                  className="flex items-center gap-2 px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  {currentRound >= gameConfig.totalRounds ? 'Terminer' : 'Question suivante'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Vue de fin de partie
   * Affichage des scores finaux
   */
  const FinishedView = () => {
    // Trier les équipes par score
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const winningTeam = sortedTeams[0];

    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête avec résultat */}
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold">Partie terminée !</h2>
            <p className="text-xl text-gray-600">
              {winningTeam.name} remporte la partie avec {winningTeam.score} points !
            </p>
          </div>

          {/* Tableau des scores */}
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 ${
                    index === 0 ? 'bg-yellow-50' : 'bg-gray-50'
                  } rounded-xl mb-2`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${team.color} flex items-center justify-center text-white font-bold`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-sm text-gray-500">{team.score} points</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setGameState('home')}
              className="px-6 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={startGame}
              className="px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Rejouer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const RevealView = () => {
    const currentSong = songs[currentSongIndex];

    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto">
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-8 space-y-8">
              {/* En-tête */}
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold">Révélation</h2>
                {selectedTeam ? (
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <p className="text-xl text-gray-600">
                      {teams.find(t => t.id === selectedTeam)?.name} remporte la manche !
                    </p>
                  </div>
                ) : (
                  <p className="text-xl text-gray-600">
                    Personne n'a trouvé la réponse
                  </p>
                )}
              </div>

              {/* Détails de la chanson avec artwork */}
              {currentSong && (
                <div className="relative overflow-hidden">
                  {/* Fond flou */}
                  {currentSong.albumArt && (
                    <div 
                      className="absolute inset-0 blur-2xl opacity-20"
                      style={{
                        backgroundImage: `url(${currentSong.albumArt})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  )}

                  <div className="relative p-8 bg-white/80 backdrop-blur-sm rounded-xl">
                    <div className="flex items-center gap-8">
                      {/* Artwork ou fallback */}
                      <div className="w-48 h-48 overflow-hidden rounded-lg shadow-lg shrink-0">
                        {currentSong.albumArt ? (
                          <img 
                            src={currentSong.albumArt} 
                            alt={`Album ${currentSong.album}`}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-100 to-pink-100">
                            <Music2 className="w-16 h-16 text-purple-300" />
                          </div>
                        )}
                      </div>

                      {/* Informations */}
                      <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-bold">{currentSong.name}</h3>
                          <p className="text-xl text-gray-600">{currentSong.artist}</p>
                          <p className="text-gray-500">{currentSong.album}</p>
                        </div>

                        {currentSong.spotifyUri && (
                          <a
                            href={`https://open.spotify.com/track/${currentSong.spotifyUri.split(':')[2]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600"
                          >
                            Ouvrir dans Spotify
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action suivante */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (currentRound >= gameConfig.totalRounds) {
                      setGameState('finished');
                    } else {
                      nextRound();
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 font-bold text-white transition-colors bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700"
                >
                  {currentRound >= gameConfig.totalRounds ? 'Terminer' : 'Question suivante'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="h-16 px-4 mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-full">
          {/* Logo et titre */}
          <div className="flex items-center gap-2">
            <Music2 className="w-6 h-6 text-purple-600" />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Quiz Party
            </span>
          </div>

          {/* Statut Spotify */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {spotifyState.isAuthenticated ? 'Spotify connecté' : 'Spotify déconnecté'}
            </span>
            <div 
              className={`w-2 h-2 rounded-full ${
                spotifyState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSpotifyConfigOpen(true)}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {spotifyState.isAuthenticated ? (
              <button
                onClick={handleSpotifyLogout}
                className="px-3 py-1 text-sm text-red-600 rounded-lg hover:bg-red-50"
              >
                Déconnexion
              </button>
            ) : (
              <button
                onClick={handleSpotifyLogin}
                className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
              >
                Connecter Spotify
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

  // ===============================================
  // RENDU PRINCIPAL
  // ===============================================
  
  return (
    <div className="min-h-screen">
      <Navbar />
      {gameState === 'home' && <HomeView />}
      {gameState === 'preparation' && <PreparationView />}
      {gameState === 'playing' && <GameView />}
      {gameState === 'reveal' && <RevealView />}
      {gameState === 'finished' && <FinishedView />}
      <NotificationDisplay />
      {isSpotifyConfigOpen && <SpotifyConfigModal />}
      {/* Notification d'erreur audio */}
      {audioError && (
        <div className="fixed px-4 py-2 text-red-600 bg-red-100 rounded-lg shadow-lg bottom-4 right-4">
          {audioError}
        </div>
      )}
    </div>
  );
};

export default App;
