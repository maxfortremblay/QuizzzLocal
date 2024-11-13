import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Award } from 'lucide-react';
import { Team } from '../types/game';

interface ScoreBoardProps {
  teams: Team[];
  selectedTeam: string | null;
  onTeamSelect?: (teamId: string) => void;
  showStats?: boolean;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  teams,
  selectedTeam,
  onTeamSelect,
  showStats = false
}) => {
  const [animateScores, setAnimateScores] = useState(false);

  // Animation des scores à l'entrée
  useEffect(() => {
    const timer = setTimeout(() => setAnimateScores(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getPositionClass = (index: number) => {
    switch(index) {
      case 0: return 'bg-yellow-50 border-yellow-200';
      case 1: return 'bg-gray-50 border-gray-200';
      case 2: return 'bg-orange-50 border-orange-200';
      default: return 'bg-white border-gray-100';
    }
  };

  const getPositionIcon = (index: number) => {
    switch(index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1: return <Star className="w-6 h-6 text-gray-500" />;
      case 2: return <Award className="w-6 h-6 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {teams.map((team, index) => (
        <div
          key={team.id}
          onClick={() => onTeamSelect?.(team.id)}
          className={`p-4 transition-all duration-300 ${getPositionClass(index)} ${
            selectedTeam === team.id ? 'ring-2 ring-purple-500' : ''
          } ${onTeamSelect ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
        >
          <div className="flex items-center gap-4">
            {/* Position et icône */}
            <div className="flex items-center justify-center w-10 h-10 text-lg font-bold text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              {index + 1}
            </div>

            {/* Infos équipe */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{team.name}</span>
                {getPositionIcon(index)}
              </div>
              
              {showStats && (
                <div className="mt-1 text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{team.totalCorrectAnswers} bonnes réponses</span>
                    {team.currentStreak > 1 && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Série: {team.currentStreak}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Score */}
            <div className={`text-2xl font-bold transition-all duration-1000 ${
              animateScores ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-4'
            }`}>
              {team.score}
              <span className="ml-1 text-sm text-gray-500">pts</span>
            </div>
          </div>

          {/* Barre de progression */}
          {showStats && (
            <div className="relative h-1 mt-3 overflow-hidden bg-gray-200 rounded-full">
              <div
                className="absolute top-0 left-0 h-full transition-all duration-1000 bg-gradient-to-r from-purple-600 to-pink-600"
                style={{
                  width: `${(team.score / teams[0].score) * 100}%`,
                  transform: animateScores ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left'
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};