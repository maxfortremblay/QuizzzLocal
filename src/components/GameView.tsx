import React, { useEffect, useCallback, useState } from 'react';
import { Timer } from './Timer';
import { ScoreBoard } from './ScoreBoard';
import { useGame } from '../contexts/GameContext';
import { useAudio } from '../hooks/useAudio';
import { Team, Song, GameConfig, GameError } from '../types/game';
import { Play, Pause, Volume2, Music2, Crown } from 'lucide-react';

interface GameViewProps {
  teams: Team[];
  songs: Song[];
  gameConfig: GameConfig;
  onUpdateTeams: (teams: Team[]) => void;
  onGameEnd: () => void;
  onError: (type: 'audio' | 'game', message: string) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  teams,
  songs,
  gameConfig,
  onUpdateTeams,
  onGameEnd,
  onError
}) => {
  // États locaux
  const [currentRound, setCurrentRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roundState, setRoundState] = useState<'countdown' | 'playing' | 'revealing'>('countdown');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Hooks
  const { play, pause, setVolume } = useAudio({
    onError: (error) => onError('audio', error)
  });

  // Gestionnaires
  const handleStartRound = useCallback(async () => {
    if (currentRound > songs.length) {
      onGameEnd();
      return;
    }

    const song = songs[currentRound - 1];
    if (!song?.previewUrl) {
      onError('game', 'Preview non disponible');
      return;
    }

    setRoundState('countdown');
    
    // Compte à rebours
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      await play(song.previewUrl);
      setIsPlaying(true);
      setStartTime(Date.now());
      setRoundState('playing');

      // Gestion du volume
      const fadeInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime!) / 1000;
        const progress = Math.min(1, elapsed / gameConfig.duration);
        const volume = gameConfig.volumeStart - (gameConfig.volumeStart - gameConfig.volumeEnd) * progress;
        setVolume(volume);

        if (progress >= 1) {
          clearInterval(fadeInterval);
          handleRoundEnd();
        }
      }, 100);

      return () => clearInterval(fadeInterval);
    } catch (error) {
      onError('audio', 'Erreur de lecture');
    }
  }, [currentRound, songs, gameConfig, play, setVolume, onError, onGameEnd]);

  const handleAnswer = useCallback((teamId: string) => {
    if (roundState !== 'playing' || !startTime) return;

    const answerTime = Date.now();
    const timeTaken = (answerTime - startTime) / 1000;

    // Calcul des points
    const basePoints = gameConfig.pointSystem.basePoints;
    let points = basePoints;

    // Bonus de vitesse
    if (timeTaken < gameConfig.pointSystem.minSpeedForBonus) {
      const speedBonus = Math.min(
        gameConfig.pointSystem.maxSpeedBonus,
        (gameConfig.pointSystem.minSpeedForBonus - timeTaken) * gameConfig.pointSystem.speedBonus
      );
      points += speedBonus;
    }

    // Mise à jour des scores
    onUpdateTeams(teams.map(team => {
      if (team.id !== teamId) return team;
      return {
        ...team,
        score: team.score + points,
        lastAnswerTime: answerTime
      };
    }));

    handleRoundEnd();
  }, [roundState, startTime, gameConfig, teams, onUpdateTeams]);

  const handleRoundEnd = useCallback(() => {
    pause();
    setIsPlaying(false);
    setRoundState('revealing');
    setSelectedTeam(null);

    // Passage au round suivant
    setTimeout(() => {
      setCurrentRound(prev => prev + 1);
      setRoundState('countdown');
      handleStartRound();
    }, gameConfig.roundSettings.revealDelay * 1000);
  }, [pause, gameConfig.roundSettings.revealDelay, handleStartRound]);

  // Effet de démarrage
  useEffect(() => {
    handleStartRound();
    return () => pause();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold">
              Round {currentRound}/{gameConfig.rounds}
            </h1>
          </div>

          <Timer
            duration={gameConfig.duration}
            isRunning={roundState === 'playing'}
            onComplete={handleRoundEnd}
          />
        </div>

        {/* Zone de jeu */}
        <div className="p-6 bg-white shadow-lg rounded-xl">
          {roundState === 'countdown' && (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="text-4xl font-bold animate-bounce">
                {currentRound}
              </div>
              <div className="text-xl text-gray-600">
                Préparez-vous...
              </div>
            </div>
          )}

          {roundState === 'playing' && (
            <div className="space-y-6">
              {/* Contrôles audio */}
              <div className="flex justify-center">
                <button
                  onClick={() => isPlaying ? pause() : handleStartRound()}
                  className="p-4 text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Tableau des scores */}
              <ScoreBoard
                teams={teams}
                selectedTeam={selectedTeam}
                onTeamSelect={teamId => {
                  if (roundState === 'playing') {
                    setSelectedTeam(teamId);
                    handleAnswer(teamId);
                  }
                }}
              />
            </div>
          )}

          {roundState === 'revealing' && songs[currentRound - 1] && (
            <div className="space-y-4 text-center">
              <Crown className="w-12 h-12 mx-auto text-yellow-500 animate-pulse" />
              <div className="text-2xl font-bold">
                {songs[currentRound - 1].name}
              </div>
              <div className="text-gray-600">
                {songs[currentRound - 1].artist}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};