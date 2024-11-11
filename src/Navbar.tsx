import React, { useState } from 'react';
import { 
  Music2, Settings, Volume2, VolumeX, Menu, Save, Copy, LogOut
} from 'lucide-react';
import { useSpotifyContext } from './contexts/SpotifyContext';
import { SpotifyError } from './types/spotify';

const Navbar = () => {
  const { 
    state: { isAuthenticated, volume, isPlaying, error },
    auth,
    login, 
    logout, 
    setVolume 
  } = useSpotifyContext();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [spotifyClientId, setSpotifyClientId] = useState(
    () => localStorage.getItem('spotify_client_id') || ''
  );
  const redirectUri = `${window.location.origin}/callback`;

  // Gestionnaire de sauvegarde avec gestion d'erreur
  const handleSaveClientId = async () => {
    try {
      if (!spotifyClientId.trim()) {
        throw new Error('Veuillez entrer un Client ID valide');
      }
      localStorage.setItem('spotify_client_id', spotifyClientId);
      
      // Feedback visuel
      const button = document.getElementById('save-button');
      if (button) {
        button.innerText = 'Sauvegardé !';
        setTimeout(() => {
          button.innerText = 'Sauvegarder';
        }, 2000);
      }
    } catch (err) {
      // L'erreur sera gérée par le contexte
      console.error('Erreur de sauvegarde:', err);
    }
  };

  // Copie de l'URL avec gestion d'erreur
  const handleCopyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      
      const button = document.getElementById('copy-button');
      if (button) {
        button.innerText = 'Copié !';
        setTimeout(() => {
          button.innerText = 'Copier';
        }, 2000);
      }
    } catch (err) {
      console.error('Erreur de copie:', err);
    }
  };

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
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Quiz Party
              </span>
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex items-center gap-2">
            {/* Volume */}
            <button 
              onClick={() => setVolume(volume === 0 ? 50 : 0)}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Paramètres */}
            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 z-50 p-4 mt-2 bg-white rounded-lg shadow-lg w-96">
                  <h3 className="mb-4 font-semibold">Paramètres Spotify</h3>
                  
                  <div className="space-y-4">
                    {/* Client ID */}
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Client ID Spotify
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spotifyClientId}
                          onChange={(e) => setSpotifyClientId(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Entrez votre Client ID"
                        />
                        <button
                          id="save-button"
                          onClick={handleSaveClientId}
                          className="flex items-center gap-2 px-3 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          <Save className="w-4 h-4" />
                          Sauvegarder
                        </button>
                      </div>
                    </div>

                    {/* URL de Redirection */}
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        URL de Redirection Spotify
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={redirectUri}
                          readOnly
                          className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                        />
                        <button
                          id="copy-button"
                          onClick={handleCopyRedirectUri}
                          className="flex items-center gap-2 px-3 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          <Copy className="w-4 h-4" />
                          Copier
                        </button>
                      </div>
                    </div>

                    {/* Actions Spotify */}
                    <div className="pt-4 mt-4 space-y-2 border-t">
                      <button
                        onClick={login}
                        disabled={!spotifyClientId || isAuthenticated}
                        className="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Music2 className="w-4 h-4" />
                        Se connecter à Spotify
                      </button>
                      <button
                        onClick={logout}
                        disabled={!isAuthenticated}
                        className="flex items-center w-full gap-2 px-4 py-2 text-left text-red-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>

                    {/* Affichage des erreurs */}
                    {error && (
                      <div className="px-3 py-2 text-sm text-red-600 rounded-lg bg-red-50">
                        {error.message}
                      </div>
                    )}
                  </div>
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
