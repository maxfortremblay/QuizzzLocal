/**
 * Quiz Musical - Application principale
 * Structure complète de l'application en un fichier unique
 * 
 * Fonctionnalités :
 * - Gestion des équipes (2-4 équipes)
 * - Configuration du jeu et playlists
 * - Lecture audio avec gestion d'erreurs
 * - Système de points et bonus
 * - Persistance des données
 * - Navigation fluide entre vues
 */

// Imports externes
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Music2, Play, Pause, Clock, Check, X, ChevronRight, 
  Settings, Star, Users, Plus, AlertCircle, Search,
  Trophy, ArrowLeft, Volume2, VolumeX, LogOut // Ajout d'icônes manquantes
} from 'lucide-react';

// Imports internes
import Navbar from './components/Navbar';
import { AdminPrepModal } from './components/AdminPrepModal';
import { SpotifyProvider, useSpotifyContext } from './contexts/SpotifyContext';
import DynamicBackground from './components/DynamicBackground';
import { SpotifyApiTrack, Song } from './types/spotify';

// Types de base
interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  members: string[];
  lastUpdated?: number; // Ajout du timestamp pour le suivi
}

// Types et interfaces locales
interface PreparationViewProps {
  teams: Team[];
  songs: Song[];
  gameConfig: GameConfig;
  onStartGame: () => void;
  onBackToHome: () => void;
  setGameConfig: (config: GameConfig) => void;
}

interface GameConfig {
  rounds: number;
  duration: number;
  volumeStart: number;
  volumeEnd: number;
  bonuses: {
    albumName: boolean;
    releaseYear: boolean;
  };
}

interface Round {
  number: number;
  volume: number;
  duration: number;
}

interface AudioControls {
  play: () => void;
  pause: () => void;
  setVolume: (value: number) => void;
}

type GameState = 'home' | 'preparation' | 'playing' | 'finished';
type ErrorType = 'audio' | 'storage' | 'general' | 'conversion';

interface GameError {
  type: ErrorType;
  message: string;
  timestamp: number;
}

// Types complémentaires
interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
}

interface SearchState {
  query: string;
  isLoading: boolean;
  results: Song[];
  error: string | null;
}

// Types basés sur l'API Spotify
interface SpotifyTrack {
  id: string;
  name: string;
  previewUrl: string | null;
  artists: { name: string }[];
  album: {
    name: string;
    release_date: string;
  };
  uri: string;
}

// Définition de l'interface SpotifyTrack
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  previewUrl: string;
  uri: string; // Ajout de la propriété manquante
  year?: string;
}

// Définition de l'interface Song
interface Song {
  id: string;
  name: string;
  artists: string[];
  album: string;
  year?: number;  // Optionnel
  previewUrl: string;
  uri: string;
}

// Mise à jour de la config par défaut
const DEFAULT_CONFIG: GameConfig = {
  rounds: 5,
  duration: 30,
  volumeStart: 1,
  volumeEnd: 0,
  bonuses: {
    albumName: false,
    releaseYear: false
  }
};

// En haut du fichier App.tsx, après les imports
const convertToSong = (track: SpotifyTrack): Song | null => {
  if (!track.previewUrl) return null;
  
  return {
    id: track.id,
    name: track.name,
    artist: track.artists[0].name,
    album: track.album.name,
    albumCover: track.album.images[0]?.url,
    previewUrl: track.previewUrl,
    spotifyUri: track.uri,
    year: track.year ? parseInt(track.year, 10) : undefined // Conversion en number
  };
};

// Déclaration unique de la fonction isSpotifyTrackValid
const isSpotifyTrackValid = (track: SpotifyApiTrack): boolean => {
  return track.preview_url !== null;
};

const App: React.FC = () => {
  // États et hooks
  const [gameState, setGameState] = useState<GameState>('home');
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState<GameError | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isAdminPrepOpen, setIsAdminPrepOpen] = useState(false);

  // Configuration des scopes Spotify et logique d'authentification
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');

  const handleSpotifyAuth = () => {
    const storedClientId = localStorage.getItem('spotify_client_id');
    
    if (!storedClientId) {
      setError({
        type: 'general',
        message: 'Veuillez d\'abord configurer votre Client ID Spotify dans les paramètres',
        timestamp: Date.now()
      });
      return;
    }

    const params = new URLSearchParams({
      client_id: storedClientId,
      redirect_uri: `${window.location.origin}/callback`,
      response_type: 'token',
      scope: scopes
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const checkAndSetToken = () => {
    // Vérifier le token dans l'URL
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('spotify_token', token);
        setSpotifyToken(token);
        // Nettoyer l'URL
        window.history.pushState({}, '', window.location.pathname);
      }
    }
    // Vérifier le token dans localStorage
    const storedToken = localStorage.getItem('spotify_token');
    if (storedToken) {
      setSpotifyToken(storedToken);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spotify_token');
    setSpotifyToken(null);
  };

  useEffect(() => {
    checkAndSetToken();
  }, []);

  // États Spotify
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyApiTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const convertSpotifyTrackToSong = (track: SpotifyApiTrack): Song | null => {
    if (!track.preview_url) return null;
    
    return {
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      previewUrl: track.preview_url,
      spotifyUri: track.uri,
      year: new Date(track.album.release_date).getFullYear()
    };
  };

  const handleTrackSelection = (tracks: SpotifyApiTrack[]) => {
    const validSongs = tracks
      .filter(isSpotifyTrackValid)
      .map(convertSpotifyTrackToSong)
      .filter((song): song is Song => song !== null);
    
    setSongs(validSongs);
  };

  // Ajout de la fonction handleRemoveTeam
  const handleRemoveTeam = (teamId: string) => {
    setTeams(prev => {
      const newTeams = prev.filter(team => team.id !== teamId);
      localStorage.setItem('quiz_teams', JSON.stringify(newTeams));
      return newTeams;
    });
  };

  // ===============================================
  // ÉTATS DU JEU
  // ===============================================
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(gameConfig.duration);
  const [countdown, setCountdown] = useState(3);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [bonusSelections, setBonusSelections] = useState<string[]>([]);
  const [roundComplete, setRoundComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ===============================================
  // GESTION AUDIO
  // ===============================================
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [volume, setVolume] = useState(gameConfig.volumeStart);

  // ===============================================
  // EFFETS ET GESTIONNAIRES
  // ===============================================

  /**
   * Gestionnaire d'erreurs centralisé
   */
  const handleError = useCallback((type: ErrorType, message: string) => {
    setError({ type, message, timestamp: Date.now() });
    
    // Auto-clear après 5 secondes
    setTimeout(() => setError(null), 5000);
  }, []);

  /**
   * Chargement sécurisé des données
   */
  const safeLoadData = <T,>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (err) {
      handleError('storage', `Erreur de chargement: ${key}`);
      return defaultValue;
    }
  };

  /**
   * Chargement initial des données sauvegardées
   */
  useEffect(() => {
    setTeams(safeLoadData('quizTeams', []));
    setGameConfig(safeLoadData('quizConfig', DEFAULT_CONFIG));
    setSongs(safeLoadData('quizSongs', []));
  }, []);

  /**
   * Sauvegarde automatique des données avec timestamp
   */
  useEffect(() => {
    const saveData = () => {
      try {
        if (teams.length > 0) {
          localStorage.setItem('quizTeams', JSON.stringify(teams.map(team => ({
            ...team,
            lastUpdated: Date.now()
          }))));
        }
        if (songs.length > 0) {
          localStorage.setItem('quizSongs', JSON.stringify(songs));
        }
        localStorage.setItem('quizConfig', JSON.stringify({
          ...gameConfig,
          lastUpdated: Date.now()
        }));
      } catch (err) {
        handleError('storage', 'Erreur de sauvegarde des données');
      }
    };

    saveData();
  }, [teams, songs, gameConfig]);

  /**
   * Fonction utilitaire pour transition entre états
   */
  const transitionToState = (newState: GameState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setGameState(newState);
      setIsTransitioning(false);
    }, 300);
  };

  const startGame = useCallback(() => {
    // Réinitialisation des états du jeu
    setCurrentRound({
      number: 1,
      volume: gameConfig.volumeStart,
      duration: gameConfig.duration
    });
    
    // Réinitialisation des autres états
    setCurrentSongIndex(0);
    setTimeLeft(gameConfig.duration);
    setSelectedTeam(null);
    setBonusSelections([]);
    setRoundComplete(false);
    
    // Transition vers l'état de jeu
    transitionToState('playing');
  }, [gameConfig]);

  // ===============================================
  // FONCTIONS UTILITAIRES
  // ===============================================

  const addTeam = useCallback((name: string) => {
    if (teams.length >= 4) return;
    
    setTeams(prev => [...prev, {
      id: Date.now().toString(),
      name: name.trim(),
      color: `bg-gradient-to-r from-purple-${500 + teams.length * 100} to-pink-${500 + teams.length * 100}`,
      score: 0,
      members: []
    }]);
  }, [teams.length]);

  const removeTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  }, []);

  const TEAM_COLORS = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500'
  ];

  // ===============================================
  // COMPOSANTS DE VUE
  // ===============================================

  const HomeView = () => {
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [teamError, setTeamError] = useState<string | null>(null);
  
    const handleAddTeam = () => {
      const trimmedName = newTeamName.trim();
      
      if (!trimmedName) {
        setTeamError("Le nom de l'��quipe ne peut pas être vide");
        return;
      }
  
      if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
        setTeamError("Ce nom d'équipe existe déjà");
        return;
      }
  
      if (teams.length >= 4) {
        setTeamError("Maximum 4 équipes autorisées");
        return;
      }
  
      // Ajoutez la suite ici
      const newTeam: Team = {
        id: Date.now().toString(),
        name: trimmedName,
        color: TEAM_COLORS[teams.length],
        score: 0,
        members: []
      };
  
      setTeams(prev => {
        const updatedTeams = [...prev, newTeam];
        localStorage.setItem('quiz_teams', JSON.stringify(updatedTeams));
        return updatedTeams;
      });
      setNewTeamName('');
      setShowAddTeam(false);
      setTeamError(null);
    };
  
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-6xl font-bold">
              <span className="text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
                Quiz Party
              </span>
            </h1>
            <p className="text-gray-500">Créez vos équipes pour commencer</p>
          </div>
  
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6 space-y-6">
              <div className="p-6 border-b">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Users className="w-5 h-5" />
                  Équipes ({teams.length}/4)
                </h2>
              </div>
  
              {/* Liste des équipes */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className="p-4 transition-all duration-200 bg-gray-50 rounded-xl hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${team.color} 
                          flex items-center justify-center text-white font-semibold`}
                        >
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          <p className="text-sm text-gray-500">Score: {team.score}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTeam(team.id)}
                        className="p-2 text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
  
                {teams.length < 4 && (
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="flex items-center justify-center h-40 gap-2 text-gray-500 transition-all duration-200 border-2 border-gray-200 border-dashed bg-gray-50 rounded-xl hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 group"
                  >
                    <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Ajouter une équipe
                  </button>
                )}
              </div>
  
              {/* Formulaire d'ajout */}
              {showAddTeam && (
                <div className="p-4 bg-white border rounded-lg shadow-lg">
                  <h3 className="mb-4 text-lg font-semibold">Nouvelle équipe</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Nom de l'équipe
                      </label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => {
                          setNewTeamName(e.target.value);
                          setTeamError(null);
                        }}
                        placeholder="Entrez le nom de l'équipe"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500"
                        maxLength={20}
                      />
                    </div>
  
                    {teamError && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg bg-red-50">
                        <AlertCircle className="w-4 h-4" />
                        {teamError}
                      </div>
                    )}
  
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowAddTeam(false);
                          setNewTeamName('');
                          setTeamError(null);
                        }}
                        className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleAddTeam}
                        className="px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={() => setIsAdminPrepOpen(true)}
              className="flex items-center justify-center w-full gap-2 p-4 text-lg 
                font-bold text-white shadow-lg transition-all duration-200 
                bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl 
                hover:from-purple-700 hover:to-pink-700 transform 
                hover:scale-[1.01] active:scale-[0.99]"
            >
              <Music2 className="w-6 h-6" />
              Préparer la playlist
            </button>
  
            <button
              onClick={() => transitionToState('preparation')}
              disabled={teams.length < 2 || songs.length === 0}
              className="flex items-center justify-center w-full gap-2 p-4 
                text-lg font-bold text-white shadow-lg transition-all duration-200 
                bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl 
                hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 
                disabled:cursor-not-allowed transform hover:scale-[1.01] 
                active:scale-[0.99]"
            >
              <Users className="w-6 h-6" />
              Créer les équipes
            </button>
  
            {/* Messages d'aide */}
            <div className="space-y-2">
              {teams.length < 2 && (
                <p className="text-sm text-center text-gray-500">
                  Ajoutez au moins 2 équipes pour commencer
                </p>
              )}
              {songs.length === 0 && (
                <p className="text-sm text-center text-gray-500">
                  Préparez la playlist avant de commencer
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  /**
   * Vue de préparation
   * Configuration du jeu et sélection des playlists
   * Ajouts :
   * - Prévisualisation des chansons
   * - Validation améliorée
   * - Feedback utilisateur
   */
  const PreparationView: React.FC<{ teams: Team[] }> = ({ teams }) => {
    // Logique existante de PreparationView
    return (
      <div className="container px-4 mx-auto">
        {/* Contenu de PreparationView */}
      </div>
    );
  };

  const GameView: React.FC = () => {
    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // États
    const [volume, setVolume] = useState<number>(1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(3);
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
  
    // Fonctions de contrôle audio
    const handlePlay = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, []);
  
    const handlePause = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, []);
  
    const handleVolumeChange = useCallback((newVolume: number) => {
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
        setVolume(newVolume);
      }
    }, []);
  
    // Timer de décompte
    useEffect(() => {
      if (countdown > 0) {
        const timer = setInterval(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
      }
    }, [countdown]);
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <audio ref={audioRef} src="/path/to/audio.mp3" />
        {/* Reste du JSX */}
      </div>
    );
  };

  /**
   * Vue de fin de partie
   * Affichage des scores et animations
   */
  const FinishedView = () => {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }, []);

    const winningTeam = sortedTeams[0];

    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête avec résultat */}
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold">Félicitations !</h2>
            <p className="text-xl text-gray-600">
              {winningTeam.name} remporte la partie avec {winningTeam.score} points !
            </p>
          </div>

          {/* Tableau des scores */}
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6 space-y-2">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 
                    ${index === 0 ? 'bg-yellow-50' : 'bg-gray-50'} 
                    rounded-xl transition-all duration-300 transform hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${team.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-sm text-gray-500">{team.score} points</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => transitionToState('home')}
              className="px-6 py-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={startGame}
              className="px-6 py-2 text-white transition-all duration-200 transform bg-purple-600 rounded-lg hover:bg-purple-700 hover:scale-105"
            >
              Rejouer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===============================================
  // RENDU PRINCIPAL
  // ===============================================
  const SpotifyAuthComponent = () => {
    if (spotifyToken) {
      return (
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleSpotifyAuth}
            className="flex items-center gap-2 btn-primary"
          >
            Se déconnecter
          </button>
        </div>
      );
    }

    return (
      <button 
        onClick={handleSpotifyAuth}
        className="flex items-center gap-2 btn-primary"
      >
        Se connecter avec Spotify
      </button>
    );
  };

    
    try {
      const year = parseInt(track.album.release_date.split('-')[0], 10);
      
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => artist.name),
        album: track.album.name,
        year: isNaN(year) ? undefined : year,
        previewUrl: track.preview_url!,
        uri: track.uri,
      };
    } catch (err) {
      console.error('Erreur lors de la conversion:', err);
      return null;
    }
  }, [isSpotifyTrackValid as (track: SpotifyApiTrack) => boolean]);

  // Exemple d'utilisation mise à jour
  const someFunction = (track: SpotifyApiTrack) => {
    if (isSpotifyTrackValid(track)) {
      // faire quelque chose
    }
  };

  // Autres occurrences mises à jour
  const anotherFunction = (tracks: SpotifyApiTrack[]) => {
    const validTracks = tracks.filter(isSpotifyTrackValid);
    // faire quelque chose avec validTracks
  };

  // Fonction de gestion pour la sauvegarde du modal
  const handleModalSave = useCallback((tracks: SpotifyApiTrack[]) => {
    try {
      const validSongs = tracks
        .filter(isSpotifyTrackValid)
        .map(convertSpotifyTrackToSong)
        .filter((song): song is Song => song !== null);
      
      if (validSongs.length === 0) {
        throw new Error('Aucune chanson valide dans la sélection');
      }
      
      setSongs(validSongs);
      setIsAdminPrepOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la conversion des pistes';
      handleError('conversion', errorMessage);
    }
  }, [convertSpotifyTrackToSong, setSongs, setIsAdminPrepOpen, handleError]);

  useEffect(() => {
    // Votre code ici
  }, [isSpotifyTrackValid]);

  return (
    <SpotifyProvider>
      <div className="min-h-screen">  {/* Retire le bg-gradient-to-br puisque DynamicBackground s'en occupe */}
        <DynamicBackground />  {/* AJOUTER ICI, juste après l'ouverture du div */}
        <Navbar />
        
        <div className={`pt-16 transition-opacity duration-300 
          ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {gameState === 'home' && <HomeView />}
          {gameState === 'preparation' && (
            <PreparationView
              teams={teams}
            />
          )}
          {gameState === 'playing' && <GameView />}
          {gameState === 'finished' && <FinishedView />}
        </div>
  
        <AdminPrepModal
        isOpen={isAdminPrepOpen}
        onClose={() => setIsAdminPrepOpen(false)}
        onSave={handleModalSave}
        />
      </div>
    </SpotifyProvider>
  );
};

export default App;