import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Award } from 'lucide-react';
import { Team } from '../types/game';

interface ScoreBoardProps {
  teams: Team[];
  selectedTeam: string | null;
  onTeamSelect?: (teamId: string) => void;
  showStats?: boolean;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ teams, selectedTeam, onTeamSelect, showStats }) => {
  return (
    <div className="scoreboard">
      {teams.map(team => (
        <div key={team.id} className={`team ${selectedTeam === team.id ? 'selected' : ''}`}>
          <div className="team-info">
            <span className="team-name">{team.name}</span>
            <span className="team-score">{team.score}</span>
          </div>
          {showStats && (
            <div className="team-stats">
              <span>{team.totalCorrectAnswers} bonnes réponses</span>
              {team.currentStreak > 1 && (
                <span className="streak">
                  <Zap className="icon" />
                  Série: {team.currentStreak}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScoreBoard;