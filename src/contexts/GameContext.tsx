import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Team, Song, GameConfig, GameState, GameError, Round, RoundState } from '../types/game';
import { calculateGameStats } from '../utils/gameUtils';
import { calculatePoints, updateTeamScore } from '../utils/scoreUtils';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

// Types pour le contexte
interface GameContextState {
  teams: Team[];
  songs: Song[];
  config: GameConfig;
  state: GameState;
  currentRound: number;
  error: GameError | null;
  round: Round | null;
  selectedTeamId: string | null;
  isPlaying: boolean;
  currentSong: Song | null;
}

interface GameContextActions {
  startGame: () => void;
  endGame: () => void;
  nextRound: () => void;
  submitAnswer: (teamId: string, bonuses: string[]) => void;
  setTeams: (teams: Team[]) => void;
  setSongs: (songs: Song[]) => void;
  setConfig: (config: GameConfig) => void;
  selectTeam: (teamId: string) => void;
  resetGame: () => void;
}

interface GameContextValue extends GameContextState, GameContextActions {}

// Création du contexte
const GameContext = createContext<GameContextValue | undefined>(undefined);

// Types pour le reducer
type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'NEXT_ROUND'; round?: Round }
  | { type: 'SUBMIT_ANSWER'; teamId: string; bonuses: string[] }
  | { type: 'SET_TEAMS'; teams: Team[] }
  | { type: 'SET_SONGS'; songs: Song[] }
  | { type: 'SET_CONFIG'; config: GameConfig }
  | { type: 'SELECT_TEAM'; teamId: string }
  | { type: 'SET_ERROR'; error: GameError }
  | { type: 'RESET_GAME' };

// Configuration initiale du jeu avec tous les bonus requis
const initialState: GameContextState = {
  isPlaying: false,
  currentRound: 0,
  teams: [],
  round: null,
  config: {
    rounds: 10,
    bonuses: {
      albumName: false,
      releaseYear: false,
      artist: false,
      genre: false,
      streak: false,
      speed: false
    },
    pointSystem: {
      basePoints: 100,
      speedBonus: 50,
      streakMultiplier: 1.5,
      maxSpeedBonus: 100,
      minSpeedForBonus: 5
    },
    roundSettings: {
      preparationTime: 5,
      revealDelay: 3,
      transitionDelay: 2
    }
  },
  state: 'home',
  error: null,
  selectedTeamId: null,
  currentSong: null
};

// Reducer
function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        state: 'playing',
        currentRound: 1,
        error: null,
        isPlaying: true
      };

    case 'END_GAME':
      return {
        ...state,
        state: 'finished',
        selectedTeamId: null,
        isPlaying: false
      };

    case 'NEXT_ROUND':
      if (state.currentRound >= state.config.rounds) {
        return {
          ...state,
          state: 'finished'
        };
      }
      return {
        ...state,
        currentRound: state.currentRound + 1,
        selectedTeamId: null,
        round: action.round || null
      };

    case 'SUBMIT_ANSWER':
      const timeTaken = state.round ? (Date.now() - state.round.startTime) / 1000 : 0;
      const scoreResult = calculatePoints(
        state.teams.find(t => t.id === action.teamId)!,
        timeTaken,
        action.bonuses,
        state.config
      );
      return {
        ...state,
        teams: updateTeamScore(state.teams, action.teamId, scoreResult),
        selectedTeamId: null
      };

    case 'SET_TEAMS':
      return {
        ...state,
        teams: action.teams
      };

    case 'SET_SONGS':
      return {
        ...state,
        songs: action.songs
      };

    case 'SET_CONFIG':
      return {
        ...state,
        config: action.config
      };

    case 'SELECT_TEAM':
      return {
        ...state,
        selectedTeamId: action.teamId
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      };

    case 'RESET_GAME':
      return {
        ...initialState,
        teams: state.teams,  // Garde les équipes
        songs: state.songs   // Garde les chansons
      };

    default:
      return state;
  }
}

// Mise à jour du type Round
const createNewRound = (roundNumber: number, song: Song, config: GameConfig): Round => ({
  number: roundNumber,
  startTime: Date.now(),
  duration: config.roundSettings.preparationTime,
  volume: config.volumeStart,
  state: 'countdown' as RoundState, // État initial valide
  currentSong: song,
  guesses: [],
  bonusesAvailable: Object.keys(config.bonuses).filter(
    (bonus) => config.bonuses[bonus as keyof typeof config.bonuses]
  ),
  isCompleted: false
});

// Fonction helper pour gérer les bonus
const processBonus = (bonusType: keyof GameConfig['bonuses']): void => {
  if (state.config.bonuses[bonusType]) {
    // Logique de bonus
  }
};

// Provider
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const audioPlayer = useAudioPlayer();

  const startGame = useCallback(() => {
    if (gameState.songs.length > 0) {
      const firstSong = gameState.songs[0];
      dispatch({ type: 'START_GAME' });
      if (firstSong?.previewUrl) {
        audioPlayer.play(firstSong.previewUrl);
      }
    }
  }, [gameState.songs, audioPlayer]);

  const endGame = useCallback(() => {
    dispatch({ type: 'END_GAME' });
    audioPlayer.stop();
  }, [audioPlayer]);

  const nextRound = useCallback(() => {
    if (gameState.currentRound >= gameState.config.rounds) {
      dispatch({ type: 'END_GAME' });
      return;
    }

    const nextSong = gameState.songs[gameState.currentRound];
    if (nextSong) {
      const newRound = createNewRound(
        gameState.currentRound + 1,
        nextSong,
        gameState.config
      );
      dispatch({ type: 'NEXT_ROUND', round: newRound });
    }
  }, [gameState.currentRound, gameState.songs, gameState.config]);

  const submitAnswer = useCallback((teamId: string, bonuses: string[]) => {
    dispatch({ type: 'SUBMIT_ANSWER', teamId, bonuses });
  }, []);

  const setTeams = useCallback((teams: Team[]) => {
    dispatch({ type: 'SET_TEAMS', teams });
  }, []);

  const setSongs = useCallback((songs: Song[]) => {
    dispatch({ type: 'SET_SONGS', songs });
  }, []);

  const setConfig = useCallback((config: GameConfig) => {
    dispatch({ type: 'SET_CONFIG', config });
  }, []);

  const selectTeam = useCallback((teamId: string) => {
    dispatch({ type: 'SELECT_TEAM', teamId });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const value = {
    ...gameState,
    startGame,
    endGame,
    nextRound,
    submitAnswer,
    setTeams,
    setSongs,
    setConfig,
    selectTeam,
    resetGame
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook personnalisé
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};