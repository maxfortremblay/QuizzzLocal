import React, { useState } from 'react';
import { Users, Plus, X, AlertCircle, Music2 } from 'lucide-react';
import { Team } from '../types/game';

interface HomeViewProps {
  teams: Team[];
  onAddTeam: (name: string) => void;
  onRemoveTeam: (id: string) => void;
  onOpenAdminPrep: () => void;
  onStartGame: () => void;
  hasSongs: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  teams,
  onAddTeam,
  onRemoveTeam,
  onOpenAdminPrep,
  onStartGame,
  hasSongs
}) => {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  const handleAddTeam = () => {
    const trimmedName = newTeamName.trim();
    
    if (!trimmedName) {
      setTeamError("Le nom de l'équipe ne peut pas être vide");
      return;
    }

    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
      setTeamError("Ce nom d'équipe existe déjà");
      return;
    }

    if (teams.length >= 4) {
      setTeamError("Maximum 4 équipes autorisées");
      return;
    }

    onAddTeam(trimmedName);
    setNewTeamName('');
    setShowAddTeam(false);
    setTeamError(null);
  };

  return (
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

        {/* Liste des équipes */}
        <div className="overflow-hidden bg-white shadow-lg rounded-xl">
          <div className="p-6 border-b">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users className="w-5 h-5" />
              Équipes ({teams.length}/4)
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {teams.map(team => (
                <div
                  key={team.id}
                  className="p-4 transition-all duration-200 bg-gray-50 rounded-xl hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${team.color} 
                        flex items-center justify-center text-white font-semibold`}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-sm text-gray-500">Score: {team.score}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveTeam(team.id)}
                      className="p-2 text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {teams.length < 4 && (
                <button
                  onClick={() => setShowAddTeam(true)}
                  className="flex items-center justify-center h-40 gap-2 text-gray-500 transition-all duration-200 border-2 border-gray-200 border-dashed bg-gray-50 rounded-xl hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 group"
                >
                  <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Ajouter une équipe
                </button>
              )}
            </div>

            {/* Formulaire d'ajout d'équipe */}
            {showAddTeam && (
              <div className="p-4 bg-white border rounded-lg shadow-lg">
                <h3 className="mb-4 text-lg font-semibold">Nouvelle équipe</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      Nom de l'équipe
                    </label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => {
                        setNewTeamName(e.target.value);
                        setTeamError(null);
                      }}
                      placeholder="Entrez le nom de l'équipe"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500"
                      maxLength={20}
                    />
                  </div>

                  {teamError && (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg bg-red-50">
                      <AlertCircle className="w-4 h-4" />
                      {teamError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowAddTeam(false);
                        setNewTeamName('');
                        setTeamError(null);
                      }}
                      className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddTeam}
                      className="px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={onOpenAdminPrep}
            className="flex items-center justify-center w-full gap-2 p-4 text-lg 
              font-bold text-white shadow-lg transition-all duration-200 
              bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl 
              hover:from-purple-700 hover:to-pink-700 transform 
              hover:scale-[1.01] active:scale-[0.99]"
          >
            <Music2 className="w-6 h-6" />
            Préparer la playlist
          </button>

          <button
            onClick={onStartGame}
            disabled={teams.length < 2 || !hasSongs}
            className="flex items-center justify-center w-full gap-2 p-4 
              text-lg font-bold text-white shadow-lg transition-all duration-200 
              bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl 
              hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 
              disabled:cursor-not-allowed transform hover:scale-[1.01] 
              active:scale-[0.99]"
          >
            <Users className="w-6 h-6" />
            Commencer la partie
          </button>

          {/* Messages d'aide */}
          <div className="space-y-2">
            {teams.length < 2 && (
              <p className="text-sm text-center text-gray-500">
                Ajoutez au moins 2 équipes pour commencer
              </p>
            )}
            {!hasSongs && (
              <p className="text-sm text-center text-gray-500">
                Préparez la playlist avant de commencer
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};