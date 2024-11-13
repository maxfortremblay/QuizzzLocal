import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, RotateCcw, Share2, Music2 } from 'lucide-react';
import { Team, GameStats } from '../types/game';
import ScoreBoard from './ScoreBoard'; // Mise à jour de l'importation

interface FinishedViewProps {
  teams: Team[];
  gameStats: GameStats;
  onRestart: () => void;
  onBackToHome: () => void;
}

const FinishedView: React.FC<FinishedViewProps> = ({ teams, gameStats, onRestart, onBackToHome }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Tri des équipes par score
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winningTeam = sortedTeams[0];

  useEffect(() => {
    // Désactiver les confettis après 5 secondes
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Animation d'entrée pour les statistiques
  const [showStats, setShowStats] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête avec couronne animée */}
        <div className="text-center">
          <div className="inline-block mb-4">
            <Trophy className="w-16 h-16 text-yellow-500 animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Partie terminée !
            </span>
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            {winningTeam.name} remporte la victoire avec {winningTeam.score} points !
          </p>
        </div>

        {/* Tableau des scores */}
        <div className="overflow-hidden bg-white shadow-lg rounded-xl">
          <ScoreBoard 
            teams={sortedTeams}
            selectedTeam={selectedTeam}
            onTeamSelect={setSelectedTeam}
            showStats={true}
          />
        </div>

        {/* Statistiques de la partie */}
        <div className={`space-y-4 transition-all duration-500 ${
          showStats ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
        }`}>
          <h2 className="text-xl font-semibold">Statistiques de la partie</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Réponse la plus rapide</div>
              <div className="text-xl font-bold">{gameStats.fastestTeam}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Plus longue série</div>
              <div className="text-xl font-bold">{gameStats.longestStreak} réponses</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Total des points</div>
              <div className="text-xl font-bold">{gameStats.totalPoints} points</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Temps moyen de réponse</div>
              <div className="text-xl font-bold">{gameStats.averageResponseTime.toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </button>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-lg shadow bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <RotateCcw className="w-5 h-5" />
            Rejouer
          </button>
          <button
            onClick={() => {/* Logique de partage */}}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinishedView;