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

import React, { useState, useEffect, useRef } from 'react';
import { 
  Music2, Play, Pause, Clock, Check, X, ChevronRight, 
  Settings, Star, Users, Plus, AlertCircle, Search,
  Trophy, ArrowLeft
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
  spotifyUrl?: string;
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

type GameState = 'home' | 'preparation' | 'playing' | 'finished';

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
  
    // ===============================================
    // GESTION AUDIO
    // ===============================================
    
    const audioRef = useRef(new Audio());
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLoaded, setAudioLoaded] = useState(false);
  
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
  
    // ===============================================
    // COMPOSANTS DE VUE
    // ===============================================
  
    /**
     * Vue de la page d'accueil
     * Gestion des équipes et démarrage du jeu
     */
    const HomeView = () => (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête */}
          <div className="text-center">
            <h1 className="text-6xl font-bold">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Quiz Party
              </span>
            </h1>
          </div>
  
          {/* Gestion des équipes */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Équipes
              </h2>
            </div>
  
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="bg-gray-50 rounded-xl p-4">
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
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
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
                    className="h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors"
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
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Settings className="w-6 h-6" />
            Préparer la partie
          </button>
        </div>
      </div>
    );
  
    [Suite du code précédent, après HomeView et avant le RENDU PRINCIPAL]

  /**
   * Vue de préparation
   * Configuration du jeu et sélection des playlists
   */
  const PreparationView = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
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

        {/* Configuration des playlists */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5" />
            <h3 className="font-semibold">Playlist du quiz</h3>
          </div>

          {/* Recherche Spotify */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une chanson..."
              className="w-full px-4 py-2 pl-10 border rounded-lg"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* Liste des chansons sélectionnées */}
          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{song.name}</div>
                  <div className="text-sm text-gray-500">{song.artist}</div>
                </div>
                <div className="text-sm text-gray-400">#{index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration du jeu */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Règles du jeu</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Durée du chronomètre
              </label>
              <select
                value={gameConfig.roundDuration}
                onChange={(e) => setGameConfig(prev => ({
                  ...prev,
                  roundDuration: Number(e.target.value)
                }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value={20}>20 secondes</option>
                <option value={30}>30 secondes</option>
                <option value={45}>45 secondes</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Bonus activés</label>
              
              <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
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
                  className="text-purple-600"
                />
                <span className="ml-3">Nom de l'album (+25 points)</span>
              </label>

              <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
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
                  className="text-purple-600"
                />
                <span className="ml-3">Année de sortie (+50 points)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action de démarrage */}
        <button
          onClick={startGame}
          disabled={songs.length < 10}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play className="w-6 h-6" />
          Commencer la partie
        </button>
      </div>
    </div>
  );

  /**
   * Vue du jeu en cours
   * Lecture de la musique et validation des réponses
   */
  const GameView = () => {
    // Si on est en décompte initial
    if (countdown > 0) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 -m-8 rounded-full bg-white/20 animate-pulse" />
            <div className="relative w-48 h-48 rounded-full bg-white flex items-center justify-center">
              <span className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-pink-600">
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
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / gameConfig.roundDuration) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Info de la partie */}
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">
                Round {currentRound}/{gameConfig.totalRounds}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold">{timeLeft}s</span>
              </div>
            </div>

            {/* Zone de lecture */}
            <div className="aspect-square bg-white rounded-xl shadow-lg flex items-center justify-center relative group">
              <Music2 className="w-24 h-24 text-gray-300" />
              
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  if (isPlaying) {
                    audioRef.current.pause();
                  } else {
                    audioRef.current.play();
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>

            {/* Équipes et validation */}
            <div className="grid grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white p-4 rounded-xl shadow">
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
                      className="w-full py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
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
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête avec résultat */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Partie terminée !</h2>
            <p className="text-xl text-gray-600">
              {winningTeam.name} remporte la partie avec {winningTeam.score} points !
            </p>
          </div>

          {/* Tableau des scores */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
              className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={startGame}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
  
  return (
    <div>
      {gameState === 'home' && <HomeView />}
      {gameState === 'preparation' && <PreparationView />}
      {gameState === 'playing' && <GameView />}
      {gameState === 'finished' && <FinishedView />}
    </div>
  );
};

export default App;