import React, { useState } from 'react';
import { Settings, Clock, Music2, ChevronLeft } from 'lucide-react';
import { GameConfig, Team } from '../types/game';
import { AudioPlayer } from './AudioPlayer';
import { Timer } from './Timer';

interface PreparationViewProps {
  teams: Team[];
  gameConfig: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  onBack: () => void;
  onStart: () => void;
}

export const PreparationView: React.FC<PreparationViewProps> = ({
  teams,
  gameConfig,
  onConfigChange,
  onBack,
  onStart
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'points' | 'audio'>('general');
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  const updateConfig = (updates: Partial<GameConfig>) => {
    onConfigChange({ ...gameConfig, ...updates });
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>
          <h1 className="text-2xl font-bold">Configuration de la partie</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          {[
            { id: 'general', icon: Settings, label: 'Général' },
            { id: 'points', icon: Music2, label: 'Points & Bonus' },
            { id: 'audio', icon: Clock, label: 'Audio & Timer' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${activeTab === tab.id 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des tabs */}
        <div className="p-6 bg-white shadow-lg rounded-xl">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Nombre de rounds
                </label>
                <input
                  type="number"
                  value={gameConfig.rounds}
                  onChange={e => updateConfig({ rounds: Number(e.target.value) })}
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Durée par round (secondes)
                </label>
                <input
                  type="number"
                  value={gameConfig.duration}
                  onChange={e => updateConfig({ duration: Number(e.target.value) })}
                  min={10}
                  max={60}
                  step={5}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Configuration des délais */}
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Temps de préparation (secondes)
                </label>
                <input
                  type="number"
                  value={gameConfig.roundSettings.preparationTime}
                  onChange={e => updateConfig({
                    roundSettings: {
                      ...gameConfig.roundSettings,
                      preparationTime: Number(e.target.value)
                    }
                  })}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
          )}

          {activeTab === 'points' && (
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Points de base
                </label>
                <input
                  type="number"
                  value={gameConfig.pointSystem.basePoints}
                  onChange={e => updateConfig({
                    pointSystem: {
                      ...gameConfig.pointSystem,
                      basePoints: Number(e.target.value)
                    }
                  })}
                  min={50}
                  max={200}
                  step={10}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Bonus */}
              <div className="space-y-4">
                <h3 className="font-medium">Bonus activés</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'albumName', label: 'Nom de l\'album' },
                    { id: 'releaseYear', label: 'Année de sortie' },
                    { id: 'artist', label: 'Artiste' },
                    { id: 'streak', label: 'Série de bonnes réponses' }
                  ].map(bonus => (
                    <label
                      key={bonus.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={gameConfig.bonuses[bonus.id as keyof typeof gameConfig.bonuses]}
                        onChange={e => updateConfig({
                          bonuses: {
                            ...gameConfig.bonuses,
                            [bonus.id]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span>{bonus.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Volume */}
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Volume initial
                </label>
                <input
                  type="range"
                  value={gameConfig.volumeStart * 100}
                  onChange={e => updateConfig({ volumeStart: Number(e.target.value) / 100 })}
                  min={0}
                  max={100}
                  className="w-full"
                />
              </div>

              {/* Test audio */}
              {testAudioUrl && (
                <AudioPlayer
                  url={testAudioUrl}
                  volume={gameConfig.volumeStart}
                  onEnded={() => setTestAudioUrl(null)}
                />
              )}

              {/* Timer de test */}
              <div className="flex items-center justify-center p-6 border rounded-lg">
                <Timer
                  duration={gameConfig.duration}
                  isRunning={false}
                  onComplete={() => {}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onBack}
            className="px-6 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={onStart}
            className="px-6 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Commencer la partie
          </button>
        </div>
      </div>
    </div>
  );
};