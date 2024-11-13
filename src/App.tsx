import React, { useState, useEffect, useCallback, createContext, ReactNode } from 'react';
import { SpotifyService } from './SpotifyService';
import Navbar from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PreparationView } from './components/PreparationView';
import { GameView } from './components/GameView';
import { FinishedView } from './components/FinishedView';
import AdminPrepModal from './components/AdminPrepModal'; // Changed to default import
import DynamicBackground from './components/DynamicBackground';
import { 
  Team, 
  Song, 
  GameConfig, 
  GameState, 
  GameError, 
  DEFAULT_CONFIG,
  GameStats 
} from './types/game';
import { SpotifyTrack } from './types/spotify';
import { isValidSpotifyTrack, convertToSong } from './utils/spotifyUtils';
import { useLocalStorage } from './hooks/useLocalStorage';

const SpotifyContext = createContext<SpotifyService | null>(null);

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SpotifyContext.Provider value={spotifyService}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const spotifyService = new SpotifyService();

const App: React.FC = () => {
  // États principaux
  const [gameState, setGameState] = useState<GameState>('home');
  const [teams, setTeams] = useLocalStorage<Team[]>('quizTeams', []);
  const [songs, setSongs] = useLocalStorage<Song[]>('quizSongs', []);
  const [gameConfig, setGameConfig] = useLocalStorage<GameConfig>('quizConfig', DEFAULT_CONFIG);
  const [error, setError] = useState<GameError | null>(null);
  const [isAdminPrepOpen, setIsAdminPrepOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [gameStats] = useState<GameStats>(() => ({
    fastestTeam: '',
    longestStreak: 0,
    totalPoints: teams.reduce((sum: number, team: Team) => sum + team.score, 0),
    roundsPlayed: songs.length,
    averageResponseTime: 0,
    teamStats: {}
  }));

  // Gestionnaire d'erreurs
  const handleError = useCallback((type: GameError['type'], message: string) => {
    setError({ 
      type, 
      message, 
      timestamp: Date.now(),
      retryable: true // Ajout de la propriété manquante
    });
    setTimeout(() => setError(null), 5000);
  }, []);

  // Gestionnaires d'équipes
  const handleAddTeam = useCallback((name: string) => {
    setTeams((prev: Team[]) => [...prev, {
      id: Date.now().toString(),
      name: name.trim(),
      color: `bg-gradient-to-r from-purple-${500 + teams.length * 100} to-pink-${500 + teams.length * 100}`,
      score: 0,
      members: []
    }]);
  }, [teams.length, setTeams]);

  const handleRemoveTeam = useCallback((teamId: string) => {
    setTeams((prev: Team[]) => prev.filter((team: Team) => team.id !== teamId));
  }, [setTeams]);

  // Gestion des transitions
  const transitionToState = useCallback((newState: GameState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setGameState(newState);
      setIsTransitioning(false);
    }, 300);
  }, []);

  // Gestion des pistes Spotify
  const handleTrackSelection = useCallback((tracks: SpotifyTrack[]) => {
    const validSongs = tracks
      .filter(isValidSpotifyTrack)
      .map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        previewUrl: track.previewUrl,
        spotifyUri: track.uri,
        year: track.year ? parseInt(track.year, 10) : undefined
      } as Song))
      .filter(Boolean);
    setSongs(validSongs);
  }, [setSongs]);

  return (
    <SpotifyProvider>
      <div className="min-h-screen">
        <DynamicBackground />
        <Navbar />
        
        {/* Notification d'erreur */}
        {error && (
          <div className="fixed z-50 px-4 py-2 text-red-600 bg-red-100 rounded-lg shadow-lg bottom-4 right-4 animate-fade-in">
            {error.message}
          </div>
        )}

        {/* Contenu principal */}
        <div className={`pt-16 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {gameState === 'home' && (
            <HomeView
              teams={teams}
              onAddTeam={handleAddTeam}
              onRemoveTeam={handleRemoveTeam}
              onOpenAdminPrep={() => setIsAdminPrepOpen(true)}
              onStartGame={() => transitionToState('playing')}
              hasSongs={songs.length > 0}
            />
          )}
          
          {gameState === 'preparation' && (
            <PreparationView
              teams={teams}
              gameConfig={gameConfig}
              onConfigChange={setGameConfig}
              onBack={() => transitionToState('home')}
              onStart={() => transitionToState('playing')}
            />
          )}
          
          {gameState === 'playing' && (
            <GameView
              teams={teams}
              songs={songs}
              gameConfig={gameConfig}
              onUpdateTeams={setTeams}
              onGameEnd={() => transitionToState('finished')}
              onError={handleError}
            />
          )}
          
          {gameState === 'finished' && (
            <FinishedView
              teams={teams}
              gameStats={gameStats} // Ajout de la prop manquante
              onRestart={() => transitionToState('playing')}
              onBackToHome={() => transitionToState('home')}
            />
          )}
        </div>

        {/* Modale de préparation */}
        <AdminPrepModal
          isOpen={isAdminPrepOpen}
          onClose={() => setIsAdminPrepOpen(false)}
          onSave={handleTrackSelection}
        />
      </div>
    </SpotifyProvider>
  );
};

export default App;