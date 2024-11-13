// Types pour la gestion des équipes
export interface Team {
    id: string;
    name: string;
    color: string;
    score: number;
    streak: number;
    streakRecord: number;
    bonusesUsed: {
      speed: number;
      streak: number;
      album: number;
      artist: number;
    };
    lastAnswerTime?: number;
    totalCorrectAnswers: number;
}
  
  // Types pour les chansons
  export interface Song {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumCover?: string;
    previewUrl: string;
    spotifyUri: string;
    year?: number;
    // Ajouts suggérés pour les chansons
    difficulty?: 'easy' | 'medium' | 'hard';
    genre?: string;
    bpm?: number;  // Pour des bonus potentiels basés sur le tempo
  }
  
  // Configuration étendue du jeu
  export interface GameConfig {
    rounds: number;
    duration: number;
    volumeStart: number;
    volumeEnd: number;
    bonuses: {
      albumName: boolean;
      releaseYear: boolean;
      // Ajouts suggérés pour les bonus
      artist: boolean;
      genre: boolean;
      streak: boolean;
      speed: boolean;
    };
    // Ajouts suggérés pour la config
    pointSystem: {
      basePoints: number;
      speedBonus: number;
      streakMultiplier: number;
      maxSpeedBonus: number;
      minSpeedForBonus: number;  // en secondes
    };
    roundSettings: {
      preparationTime: number;
      revealDelay: number;
      transitionDelay: number;
    };
  }
  
  // États du jeu plus détaillés
  export type GameState = 'home' | 'preparation' | 'playing' | 'finished';
  
  export type RoundState = 
    | 'countdown'
    | 'playing'
    | 'paused'
    | 'guessing'
    | 'revealing'
    | 'scoring'
    | 'transition';
  
  // Interface pour le round en cours
  export interface Round {
    number: number;
    volume: number;
    duration: number;
    // Ajouts suggérés pour les rounds
    state: RoundState;
    startTime: number;
    currentSong: Song;
    guesses: RoundGuess[];
    bonusesAvailable: string[];
    isCompleted: boolean;
  }
  
  // Nouveau type pour les réponses
  export interface RoundGuess {
    teamId: string;
    timestamp: number;
    isCorrect: boolean;
    pointsEarned: number;
    bonusesUsed: string[];
  }
  
  // Types d'erreurs étendus
  export type ErrorType = 
    | 'audio'
    | 'storage'
    | 'network'
    | 'spotify'
    | 'game'
    | 'validation'
    | 'general';
  
  export interface GameError {
    type: ErrorType;
    message: string;
    timestamp: number;
    // Ajouts suggérés pour les erreurs
    code?: string;
    retryable: boolean;
    details?: unknown;
  }
  
  // Constantes du jeu
  export const TEAM_COLORS = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500'
  ];
  
  export const DEFAULT_CONFIG: GameConfig = {
    rounds: 5,
    duration: 30,
    volumeStart: 1,
    volumeEnd: 0,
    bonuses: {
      albumName: false,
      releaseYear: false,
      artist: false,
      genre: false,
      streak: true,
      speed: true
    },
    pointSystem: {
      basePoints: 100,
      speedBonus: 50,
      streakMultiplier: 1.5,
      maxSpeedBonus: 200,
      minSpeedForBonus: 5
    },
    roundSettings: {
      preparationTime: 3,
      revealDelay: 2,
      transitionDelay: 3
    }
  };
  
  // Nouveau type pour les statistiques de jeu
  export interface GameStats {
    fastestTeam: string;
    longestStreak: number;
    totalPoints: number;
    roundsPlayed: number;
    averageResponseTime: number;
    teamStats: Record<string, {
      correctGuesses: number;
      averageSpeed: number;
      bonusesUsed: number;
      streakRecord: number;
    }>;
  }