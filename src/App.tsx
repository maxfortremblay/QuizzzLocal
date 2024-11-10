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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Music2, Play, Pause, Clock, Check, X, ChevronRight, 
  Settings, Star, Users, Plus, AlertCircle, Search,
  Trophy, ArrowLeft, Volume2, VolumeX, LogOut
} from 'lucide-react';
import Navbar from './Navbar';
import { SpotifyProvider } from './contexts/SpotifyContext';

// Ajoutez ces constantes en haut du fichier, après les imports
const CLIENT_ID = '3865d7b5fe544b78998db50439bc0b4c';
const redirectUri = `${window.location.origin}/callback`;

// Types et interfaces
interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  members: string[];
  lastUpdated?: number;
}

interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  previewUrl: string;
  spotifyUrl?: string;
  year?: number;
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
type ErrorType = 'audio' | 'storage' | 'general';

interface GameError {
  type: ErrorType;
  message: string;
  timestamp: number;
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

const App = () => {
  // États et hooks
  const [gameState, setGameState] = useState<GameState>('home');
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState<GameError | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  // Ajoutez cette fonction dans le composant App, avec les autres fonctions utilitaires
  const handleSpotifyAuth = () => {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
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

  // ===============================================
  // COMPOSANTS DE VUE
  // ===============================================

  const HomeView = () => (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="space-y-2 text-center">
          <h1 className="text-6xl font-bold">
            <span className="text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
              Quiz Party
            </span>
          </h1>
          <p className="text-gray-500">Créez vos équipes pour commencer</p>
        </div>

        {/* Gestion des équipes */}
        <div className="overflow-hidden bg-white shadow-lg rounded-xl">
          <div className="p-6 border-b">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users className="w-5 h-5" />
              Équipes {teams.length > 0 && `(${teams.length}/4)`}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} 
                     className="p-4 transition-all duration-200 bg-gray-50 rounded-xl hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${team.color} flex items-center justify-center text-white font-bold shadow-inner`}>
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
                      className="p-2 text-red-500 transition-colors rounded-lg hover:bg-red-50"
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
                    if (name?.trim()) addTeam(name);
                  }}
                  className="flex items-center justify-center h-40 gap-2 text-gray-500 transition-all duration-200 border-2 border-gray-200 border-dashed bg-gray-50 rounded-xl hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 group"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Ajouter une équipe
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => transitionToState('preparation')}
            disabled={teams.length < 2}
            className="flex items-center justify-center w-full gap-2 p-4 text-lg font-bold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Settings className="w-6 h-6" />
            Préparer la partie
          </button>
          
          {teams.length < 2 && (
            <p className="text-sm text-center text-gray-500">
              Ajoutez au moins 2 équipes pour commencer
            </p>
          )}
        </div>

        {/* Ajoutez ce bouton dans le composant HomeView ou où vous souhaitez placer le bouton de connexion */}
        {renderAuthButton()}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="fixed px-4 py-2 text-red-600 bg-red-100 rounded-lg shadow-lg bottom-4 right-4 animate-fade-in">
          {error.message}
        </div>
      )}
    </div>
  );

  /**
   * Vue de préparation
   * Configuration du jeu et sélection des playlists
   * Ajouts :
   * - Prévisualisation des chansons
   * - Validation améliorée
   * - Feedback utilisateur
   */
  const PreparationView = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [previewingSong, setPreviewingSong] = useState<string | null>(null);

    // Gestion de la recherche
    const handleSearch = useCallback(async (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      // Simulation recherche Spotify - à remplacer par l'API réelle
      setTimeout(() => setIsSearching(false), 1000);
    }, []);

    // Prévisualisation audio
    const previewSong = useCallback((songId: string) => {
      if (previewingSong === songId) {
        audioRef.current?.pause();
        setPreviewingSong(null);
      } else {
        setPreviewingSong(songId);
        // Logique de lecture à implémenter
      }
    }, [previewingSong]);

    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête avec navigation */}
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <Settings className="w-6 h-6 text-purple-600" />
              Préparation de la partie
            </h2>
            <button
              onClick={() => transitionToState('home')}
              className="p-2 text-gray-500 transition-colors rounded-lg hover:text-gray-700"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Configuration des playlists */}
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6 border-b">
              <h3 className="flex items-center gap-2 font-semibold">
                <Music2 className="w-5 h-5 text-purple-600" />
                Playlist du quiz
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Minimum {gameConfig.rounds} chansons nécessaires
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Recherche */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Rechercher une chanson..."
                  className="w-full px-4 py-3 pl-10 transition-all border rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                />
                <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                {isSearching && (
                  <div className="absolute transform -translate-y-1/2 right-3 top-1/2">
                    <div className="w-4 h-4 border-2 border-purple-500 rounded-full border-t-transparent animate-spin" />
                  </div>
                )}
              </div>

              {/* Liste des chansons */}
              <div className="space-y-2 overflow-y-auto max-h-96">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-4 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => previewSong(song.id)}
                        className="p-2 transition-colors rounded-full hover:bg-purple-100"
                      >
                        {previewingSong === song.id ? (
                          <Pause className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Play className="w-5 h-5 text-purple-600" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium">{song.name}</div>
                        <div className="text-sm text-gray-500">{song.artist}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">#{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration du jeu */}
          <div className="overflow-hidden bg-white shadow-lg rounded-xl">
            <div className="p-6 border-b">
              <h3 className="flex items-center gap-2 font-semibold">
                <Settings className="w-5 h-5 text-purple-600" />
                Règles et bonus
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Configuration du timer */}
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Durée du chronomètre
                  </label>
                  <select
                    value={gameConfig.duration}
                    onChange={(e) => setGameConfig(prev => ({
                      ...prev,
                      duration: Number(e.target.value)
                    }))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                  >
                    <option value={20}>20 secondes</option>
                    <option value={30}>30 secondes</option>
                    <option value={45}>45 secondes</option>
                  </select>
                </div>

                {/* Configuration du volume */}
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Volume
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setVolume(prev => prev === 0 ? 75 : 0)}
                      className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : 
                        <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Configuration des bonus */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Bonus disponibles
                </label>
                
                <label className="flex items-center p-3 transition-colors rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={gameConfig.bonuses.albumName}
                    onChange={(e) => setGameConfig(prev => ({
                      ...prev,
                      bonuses: {
                        ...prev.bonuses,
                        albumName: e.target.checked
                      }
                    }))}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-3">Nom de l'album (+25 points)</span>
                </label>

                <label className="flex items-center p-3 transition-colors rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={gameConfig.bonuses.releaseYear}
                    onChange={(e) => setGameConfig(prev => ({
                      ...prev,
                      bonuses: {
                        ...prev.bonuses,
                        releaseYear: e.target.checked
                      }
                    }))}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-3">Année de sortie (+50 points)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action de démarrage */}
          <button
            onClick={() => {
              if (songs.length >= gameConfig.rounds) {
                transitionToState('playing');
                startGame();
              } else {
                handleError('general', 
                  `Il faut au moins ${gameConfig.rounds} chansons pour commencer`);
              }
            }}
            disabled={songs.length < gameConfig.rounds}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 
              text-white rounded-xl font-bold text-lg hover:from-purple-700 
              hover:to-pink-700 shadow-lg disabled:opacity-50 
              disabled:cursor-not-allowed transition-all duration-200 transform 
              hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6" />
            Commencer la partie
          </button>
        </div>
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
    const [gameConfig, setGameConfig] = useState<GameConfig>({
      rounds: 5,
      duration: 30,
      volumeStart: 1,
      volumeEnd: 0
    });
  
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
  
    // Timer et logique de jeu
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
    const winningTeam = sortedTeams[0];

    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }, []);

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

  const renderAuthButton = () => {
    if (spotifyToken) {
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-green-500">Connecté avec succès</p>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 btn-secondary"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      );
    }

    return (
      <button 
        onClick={handleSpotifyAuth}
        className="flex items-center gap-2 btn-primary"
      >
        <Music2 className="w-5 h-5" />
        Se connecter avec Spotify
      </button>
    );
  };

  return (
    <SpotifyProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Navbar />
        
        {/* Gestion des erreurs */}
        {error && (
          <div className="fixed z-50 px-4 py-2 text-red-600 bg-red-100 rounded-lg shadow-lg cursor-pointer bottom-4 right-4 animate-fade-in"
            onClick={() => setError(null)}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error.message}
            </div>
          </div>
        )}

        {/* Rendu conditionnel des vues avec padding-top pour la Navbar */}
        <div className={`pt-16 transition-opacity duration-300 
          ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {gameState === 'home' && <HomeView />}
          {gameState === 'preparation' && <PreparationView />}
          {gameState === 'playing' && <GameView />}
          {gameState === 'finished' && <FinishedView />}
        </div>
      </div>
    </SpotifyProvider>
  );
};

export default App;