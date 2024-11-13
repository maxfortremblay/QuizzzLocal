import { Team, Song, GameConfig, GameStats, RoundState } from '../types/game';

interface ScoreResult {
  points: number;
  bonuses: {
    speed: number;
    streak: number;
  };
}

/**
 * Calcule les statistiques de jeu à partir des données de l'équipe
 */
export const calculateGameStats = (
  teams: Team[],
  rounds: number,
  startTime: number
): GameStats => {
  const totalPoints = teams.reduce((sum, team) => sum + team.score, 0);
  const fastestTeam = teams.reduce((fastest, team) => {
    if (!fastest || (team.lastAnswerTime && team.lastAnswerTime < fastest.lastAnswerTime!)) {
      return team;
    }
    return fastest;
  });

  const longestStreak = teams.reduce((max, team) => 
    Math.max(max, team.streakRecord || 0), 0);

  const totalAnswers = teams.reduce((sum, team) => 
    sum + (team.totalCorrectAnswers || 0), 0);

  const averageResponseTime = teams.reduce((sum, team) => 
    team.lastAnswerTime ? sum + (team.lastAnswerTime - startTime) : sum, 0) / totalAnswers;

  return {
    fastestTeam: fastestTeam?.name || '',
    longestStreak,
    totalPoints,
    roundsPlayed: rounds,
    averageResponseTime,
    teamStats: teams.reduce((stats, team) => ({
      ...stats,
      [team.id]: {
        correctGuesses: team.totalCorrectAnswers || 0,
        averageSpeed: team.lastAnswerTime ? (team.lastAnswerTime - startTime) / (team.totalCorrectAnswers || 1) : 0,
        bonusesUsed: team.bonusesUsed || 0,
        streakRecord: team.streakRecord || 0
      }
    }), {})
  };
};

/**
 * Détermine l'état du round suivant
 */
export const getNextRoundState = (
  currentRound: number,
  totalRounds: number,
  currentState: RoundState
): RoundState => {
  if (currentRound >= totalRounds && currentState === 'revealing') {
    return 'transition' as RoundState;
  }
  
  switch (currentState) {
    case 'countdown':
      return 'playing';
    case 'playing':
      return 'revealing';
    case 'revealing':
      return 'countdown';
    default:
      return currentState;
  }
};

/**
 * Vérifie si une équipe peut répondre
 */
export const canTeamAnswer = (
  team: Team,
  roundState: RoundState,
  currentAnswers: string[]
): boolean => {
  return (
    roundState === 'playing' &&
    !currentAnswers.includes(team.id) &&
    team.lastAnswerTime === null
  );
};

/**
 * Mélange un tableau de chansons
 */
export const shuffleSongs = (songs: Song[]): Song[] => {
  const shuffled = [...songs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Valide la configuration du jeu
 * @throws {Error} Si la configuration est invalide
 */
export const validateGameConfig = (config: GameConfig): void => {
  if (config.rounds < 1) {
    throw new Error('Le nombre de rounds doit être supérieur à 0');
  }
  if (config.duration < 10 || config.duration > 60) {
    throw new Error('La durée doit être entre 10 et 60 secondes');
  }
  if (config.volumeStart < 0 || config.volumeStart > 1) {
    throw new Error('Le volume doit être entre 0 et 1');
  }
};

export const calculatePoints = (
  team: Team,
  timeTaken: number,
  bonuses: GameConfig['bonuses'],
  config: GameConfig
): ScoreResult => {
  const basePoints = config.pointSystem.basePoints;
  let totalPoints = basePoints;
  let speedPoints = 0;
  let streakPoints = 0;

  // Calcul bonus vitesse
  if (bonuses.speed && timeTaken < config.pointSystem.minSpeedForBonus) {
    speedPoints = Math.max(
      0,
      config.pointSystem.maxSpeedBonus * 
      (1 - timeTaken / config.pointSystem.minSpeedForBonus)
    );
    totalPoints += speedPoints;
  }

  // Calcul bonus streak
  if (bonuses.streak && team.streak > 0) {
    streakPoints = team.streak * config.pointSystem.streakMultiplier;
    totalPoints += streakPoints;
  }

  return {
    points: totalPoints,
    bonuses: {
      speed: speedPoints,
      streak: streakPoints
    }
  };
};

export const updateTeamScore = (
  teams: Team[],
  teamId: string,
  scoreResult: ScoreResult
): Team[] => {
  return teams.map(team => 
    team.id === teamId 
      ? {
          ...team,
          score: team.score + scoreResult.points,
          streakRecord: Math.max(team.streakRecord, team.streak + 1),
          bonusesUsed: {
            ...team.bonusesUsed,
            speed: team.bonusesUsed.speed + (scoreResult.bonuses.speed > 0 ? 1 : 0),
            streak: team.bonusesUsed.streak + (scoreResult.bonuses.streak > 0 ? 1 : 0)
          }
        }
      : team
  );
};