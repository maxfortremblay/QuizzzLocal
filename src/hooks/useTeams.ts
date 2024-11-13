import { useState, useCallback, useEffect } from 'react';
import { Team } from '../types/game';
import { TEAM_COLORS } from '../types/game';

interface UseTeamsOptions {
  maxTeams?: number;
  persistKey?: string;
  onError?: (message: string) => void;
}

export const useTeams = (options: UseTeamsOptions = {}) => {
  const {
    maxTeams = 4,
    persistKey = 'quiz_teams',
    onError
  } = options;

  // État des équipes avec typage explicite
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const stored = localStorage.getItem(persistKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      onError?.('Erreur lors du chargement des équipes');
      return [];
    }
  });

  // Ajout d'une équipe
  const addTeam = useCallback((name: string) => {
    if (teams.length >= maxTeams) {
      onError?.(`Maximum ${maxTeams} équipes autorisées`);
      return false;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      onError?.('Le nom de l\'équipe ne peut pas être vide');
      return false;
    }

    if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
      onError?.('Ce nom d\'équipe existe déjà');
      return false;
    }

    const newTeam: Team = {
      id: Date.now().toString(),
      name: trimmedName,
      color: TEAM_COLORS[teams.length],
      score: 0,
      streak: 0,
      streakRecord: 0,
      bonusesUsed: {
        speed: 0,
        streak: 0,
        album: 0,
        artist: 0
      },
      totalCorrectAnswers: 0
    };

    setTeams(prev => [...prev, newTeam]);
    return true;
  }, [teams.length, maxTeams, onError]);

  // Suppression d'une équipe
  const removeTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  }, []);

  // Mise à jour d'une équipe
  const updateTeam = useCallback((teamId: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, ...updates } : team
    ));
  }, []);

  // Réinitialisation des scores
  const resetScores = useCallback(() => {
    setTeams(prev => prev.map(team => ({
      ...team,
      score: 0,
      streak: 0,
      streakRecord: 0,
      bonusesUsed: {
        speed: 0,
        streak: 0,
        album: 0,
        artist: 0
      },
      totalCorrectAnswers: 0
    })));
  }, []);

  // Tri des équipes
  const getSortedTeams = useCallback(() => {
    return [...teams].sort((a, b) => b.score - a.score);
  }, [teams]);

  // Persistance automatique
  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify(teams));
    } catch (error) {
      onError?.('Erreur lors de la sauvegarde des équipes');
    }
  }, [teams, persistKey, onError]);

  return {
    teams,
    addTeam,
    removeTeam,
    updateTeam,
    resetScores,
    getSortedTeams,
    hasMaxTeams: teams.length >= maxTeams
  };
};