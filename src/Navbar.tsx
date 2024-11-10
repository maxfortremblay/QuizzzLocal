import React, { useState } from 'react';
import { 
  Music2, Settings, Volume2, VolumeX, Menu
} from 'lucide-react';
import { useSpotifyContext } from './contexts/SpotifyContext';

const Navbar = () => {
  // Utilisation du hook contexte au lieu du hook service direct
  const { state, login, logout, setVolume } = useSpotifyContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="h-16 px-4 mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-full">
          {/* Logo et Titre */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Music2 className="w-6 h-6 text-purple-600" />
              <button 
                className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={login}
              >
                Quiz Party
              </button>
            </div>
          </div>

          {/* Indicateur de statut Spotify */}
          <div className="flex items-center gap-4">
            <button
              onClick={state.isAuthenticated ? logout : login}
              className={`w-2 h-2 rounded-full ${state.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}
            />
          </div>

          {/* Contrôles */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVolume(state.volume === 0 ? 50 : 0)}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {state.volume === 0 ?
                <VolumeX className="w-5 h-5" /> : 
                <Volume2 className="w-5 h-5" />
              }
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 z-50 w-56 py-2 mt-2 bg-white rounded-lg shadow-lg">
                  <button
                    onClick={login}
                    className="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Se connecter à Spotify
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                    disabled={!state.isAuthenticated}
                  >
                    Déconnexion Spotify
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
