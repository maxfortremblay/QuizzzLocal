import React, { useState, useEffect } from 'react';
import { 
  Music2, Settings, Volume2, VolumeX, Menu, Save, Copy, LogOut,
  AlertCircle, Check
} from 'lucide-react';
import { useSpotifyContext } from './contexts/SpotifyContext';

const Navbar = () => {
  const { 
    state: { isAuthenticated, volume, error },
    login, 
    logout, 
    setVolume 
  } = useSpotifyContext();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [spotifyClientId, setSpotifyClientId] = useState(
    () => localStorage.getItem('spotify_client_id') || ''
  );
  const [statusMessage, setStatusMessage] = useState('');
  const redirectUri = `${window.location.origin}/callback`;

  // Vérification du statut de connexion
  useEffect(() => {
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      setStatusMessage('Token Spotify trouvé');
    } else {
      setStatusMessage('Pas de token Spotify');
    }
  }, [isAuthenticated]);

  // Gestionnaire de sauvegarde avec retour visuel
  const handleSaveClientId = async () => {
    try {
      if (!spotifyClientId.trim()) {
        throw new Error('Veuillez entrer un Client ID valide');
      }
      localStorage.setItem('spotify_client_id', spotifyClientId);
      
      // Feedback visuel amélioré
      setStatusMessage('Client ID sauvegardé !');
      const button = document.getElementById('save-button');
      if (button) {
        button.classList.add('bg-green-600');
        setTimeout(() => {
          button.classList.remove('bg-green-600');
          setStatusMessage('');
        }, 2000);
      }
    } catch (err) {
      setStatusMessage('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
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

          {/* Statut de connexion */}
          {statusMessage && (
            <div className={`px-3 py-1 rounded-full text-sm ${
              statusMessage.includes('Error') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            }`}>
              {statusMessage}
            </div>
          )}

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
                    {/* Client ID avec indicateur de statut */}
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
                          className="flex items-center gap-2 px-3 py-2 text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          <Save className="w-4 h-4" />
                          Sauvegarder
                        </button>
                      </div>
                    </div>

                    {/* URL de Redirection avec copie */}
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        URL de Redirection
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={redirectUri}
                          readOnly
                          className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(redirectUri);
                            setStatusMessage('URL copiée !');
                            setTimeout(() => setStatusMessage(''), 2000);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          <Copy className="w-4 h-4" />
                          Copier
                        </button>
                      </div>
                    </div>

                    {/* Actions Spotify avec indicateurs de statut */}
                    <div className="pt-4 mt-4 space-y-2 border-t">
                      <button
                        onClick={login}
                        disabled={!spotifyClientId || isAuthenticated}
                        className={`flex items-center w-full gap-2 px-4 py-2 text-left rounded-lg
                          ${isAuthenticated 
                            ? 'bg-green-50 text-green-600' 
                            : 'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        {isAuthenticated ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Music2 className="w-4 h-4" />
                        )}
                        {isAuthenticated ? 'Connecté à Spotify' : 'Se connecter à Spotify'}
                      </button>
                      <button
                        onClick={logout}
                        disabled={!isAuthenticated}
                        className="flex items-center w-full gap-2 px-4 py-2 text-left text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>

                    {/* Affichage des erreurs */}
                    {error && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg bg-red-50">
                        <AlertCircle className="w-4 h-4" />
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