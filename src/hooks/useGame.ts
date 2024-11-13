import { useState, useCallback, useEffect } from 'react';
import { useAudio } from './useAudio';
import { useTimer } from './useTimer';
import { Team, Song, GameConfig, Round, RoundState, GameStats } from '../types/game';

interface UseGameOptions {
  teams: Team[];
  songs: Song[];
  config: GameConfig;
  onUpdateTeams: (teams: Team[]) => void;
  onError: (type: 'audio' | 'game', message: string) => void;
}

interface GameState {
  currentRound: number;
  roundState: RoundState;
  currentSong: Song | null;
  selectedTeam: string | null;
  availableBonuses: string[];
  roundStartTime: number | null;
  lastAnswerTime: number | null;
}

export const useGame = ({
  teams,
  songs,
  config,
  onUpdateTeams,
  onError
}: UseGameOptions) => {
  // États du jeu
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 1,
    roundState: 'countdown',
    currentSong: null,
    selectedTeam: null,
    availableBonuses: [],
    roundStartTime: null,
    lastAnswerTime: null
  });

  // Stats de jeu
  const [gameStats, setGameStats] = useState<GameStats>({
    fastestTeam: '',
    longestStreak: 0,
    totalPoints: 0,
    roundsPlayed: 0,
    averageResponseTime: 0,
    teamStats: {}
  });

  // Hooks audio et timer
  const audio = useAudio({
    initialVolume: config.volumeStart,
    onError: (error) => onError('audio', error)
  });

  const timer = useTimer({
    initialDuration: config.duration * 1000,
    onComplete: handleRoundEnd
  });

  // Démarrage d'un round
  const startRound = useCallback(async () => {
    if (gameState.currentRound > config.rounds) {
      return;
    }

    const song = songs[gameState.currentRound - 1];
    if (!song) {
      onError('game', 'Chanson non trouvée');
      return;
    }

    setGameState(prev => ({
      ...prev,
      roundState: 'countdown',
      currentSong: song,
      selectedTeam: null,
      availableBonuses: Object.keys(config.bonuses).filter(key => config.bonuses[key as keyof typeof config.bonuses]),
      roundStartTime: Date.now()
    }));

    // Démarrage du compte à rebours
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      await audio.play(song.previewUrl);
      timer.start();
      setGameState(prev => ({ ...prev, roundState: 'playing' }));
    } catch (error) {
      onError('audio', 'Erreur de lecture');
    }
  }, [gameState.currentRound, config, songs, audio, timer, onError]);

  // Gestion des réponses
  const handleAnswer = useCallback((teamId: string, bonuses: string[] = []) => {
    if (gameState.roundState !== 'playing' || !gameState.currentSong) return;

    const answerTime = Date.now();
    const timeTaken = gameState.roundStartTime ? (answerTime - gameState.roundStartTime) / 1000 : 0;

    // Calcul des points
    let points = config.pointSystem.basePoints;

    // Bonus de vitesse
    if (timeTaken < config.pointSystem.minSpeedForBonus) {
      const speedBonus = Math.min(
        config.pointSystem.maxSpeedBonus,
        (config.pointSystem.minSpeedForBonus - timeTaken) * config.pointSystem.speedBonus
      );
      points += speedBonus;
    }

    // Bonus de série
    const team = teams.find(t => t.id === teamId);
    if (team && team.currentStreak > 1) {
      points *= config.pointSystem.streakMultiplier;
    }

    // Mise à jour des équipes
    onUpdateTeams(teams.map(team => {
      if (team.id !== teamId) return team;
      
      return {
        ...team,
        score: team.score + points,
        currentStreak: team.currentStreak + 1,
        totalCorrectAnswers: team.totalCorrectAnswers + 1,
        lastAnswerTime: answerTime
      };
    }));

    // Mise à jour des stats
    setGameStats(prev => ({
      ...prev,
      fastestTeam: timeTaken < prev.teamStats[prev.fastestTeam]?.averageSpeed ? team?.name || '' : prev.fastestTeam,
      totalPoints: prev.totalPoints + points,
      teamStats: {
        ...prev.teamStats,
        [teamId]: {
          correctGuesses: (prev.teamStats[teamId]?.correctGuesses || 0) + 1,
          averageSpeed: ((prev.teamStats[teamId]?.averageSpeed || 0) * (prev.teamStats[teamId]?.correctGuesses || 0) + timeTaken) / ((prev.teamStats[teamId]?.correctGuesses || 0) + 1),
          bonusesUsed: (prev.teamStats[teamId]?.bonusesUsed || 0) + bonuses.length,
          streakRecord: Math.max(prev.teamStats[teamId]?.streakRecord || 0, team?.currentStreak || 0)
        }
      }
    }));

    // Fin du round
    handleRoundEnd();
  }, [gameState, teams, config, onUpdateTeams]);

  // Fin de round
  function handleRoundEnd() {
    audio.pause();
    timer.reset();
    
    setGameState(prev => ({
      ...prev,
      roundState: 'revealing',
      lastAnswerTime: Date.now()
    }));

    // Passer au round suivant après un délai
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        roundState: prev.currentRound >= config.rounds ? 'finished' : 'countdown'
      }));

      if (gameState.currentRound < config.rounds) {
        startRound();
      }
    }, config.roundSettings.revealDelay * 1000);
  }

  // Effets de nettoyage
  useEffect(() => {
    return () => {
      audio.pause();
      timer.reset();
    };
  }, []);

  return {
    gameState,
    gameStats,
    audio,
    timer,
    startRound,
    handleAnswer,
    selectTeam: (teamId: string) => setGameState(prev => ({ ...prev, selectedTeam: teamId }))
  };
};