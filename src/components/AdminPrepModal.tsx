import React, { useState, useCallback, useEffect } from 'react';
import { 
  Music2, Search, Play, Pause, X, Plus, 
  AlertCircle, Save, Loader
} from 'lucide-react';
import { useSpotifyContext } from '../contexts/SpotifyContext';
import { Song, SpotifyTrack } from '../types/spotify';

interface AdminPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songs: Song[]) => void;
}

// Composant pour chaque élément de chanson
const SongItem: React.FC<{
  song: SpotifyTrack;
  onPreview: (song: SpotifyTrack) => void;
  onToggle: (song: SpotifyTrack) => void;
  isPlaying: boolean;
  isSelected: boolean;
}> = ({ song, onPreview, onToggle, isPlaying, isSelected }) => (
  <div className={`flex items-center justify-between p-4 transition-colors rounded-lg 
    ${song.previewUrl ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 opacity-60'}`}
  >
    <div className="flex items-center gap-3">
      <button
        onClick={() => onPreview(song)}
        disabled={!song.previewUrl}
        className={`p-2 transition-colors rounded-full 
          ${song.previewUrl 
            ? 'hover:bg-purple-100 text-purple-600' 
            : 'text-gray-400 cursor-not-allowed'}`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>
      <div>
        <div className="font-medium">{song.name}</div>
        <div className="text-sm text-gray-500">
          {song.artist} • {song.album}
          {!song.previewUrl && (
            <span className="ml-2 text-xs text-red-500">
              Aperçu non disponible
            </span>
          )}
        </div>
      </div>
    </div>
    <button
      onClick={() => onToggle(song)}
      disabled={!song.previewUrl}
      className={`p-2 rounded-lg transition-colors ${
        !song.previewUrl 
          ? 'text-gray-400 cursor-not-allowed' 
          : isSelected
          ? 'text-red-500 hover:bg-red-50'
          : 'text-purple-600 hover:bg-purple-100'
      }`}
    >
      {isSelected ? (
        <X className="w-5 h-5" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
    </button>
  </div>
);

export const AdminPrepModal: React.FC<AdminPrepModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<SpotifyTrack[]>([]);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [previewingSong, setPreviewingSong] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Context Spotify
  const {
    state: { isAuthenticated, isLoading },
    searchTracks,
    playPreview,
    pausePreview
  } = useSpotifyContext();

  // Effet pour la recherche avec debounce
  useEffect(() => {
    console.log("Recherche initiée:", searchTerm);
    
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    if (!isAuthenticated) {
      setSearchError("Veuillez vous connecter à Spotify");
      return;
    }

    const debounceTimeout = setTimeout(async () => {
      try {
        const results = await searchTracks(searchTerm);
        console.log("Résultats reçus:", results);
        setSearchResults(results);
        setSearchError(null);
      } catch (error) {
        console.error("Erreur de recherche:", error);
        setSearchError("Erreur lors de la recherche. Veuillez réessayer.");
      }
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, searchTracks, isAuthenticated]);

  // Gestion de la prévisualisation
  const handlePreview = useCallback(async (song: SpotifyTrack) => {
    if (!song.previewUrl) {
      setSearchError("Cette chanson n'a pas d'aperçu disponible");
      return;
    }

    try {
      if (previewingSong === song.id) {
        console.log('Arrêt de la prévisualisation');
        pausePreview();
        setPreviewingSong(null);
      } else {
        console.log('Démarrage de la prévisualisation:', song.previewUrl);
        if (previewingSong) {
          pausePreview();
        }
        await playPreview(song.previewUrl);
        setPreviewingSong(song.id);
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      setSearchError("Erreur lors de la lecture de l'aperçu");
    }
  }, [previewingSong, playPreview, pausePreview]);

  // Gestion de la sélection des pistes
  const toggleTrack = useCallback((track: SpotifyTrack) => {
    if (!track.previewUrl) {
      setSearchError("Cette piste n'a pas d'aperçu disponible");
      return;
    }
    
    setSelectedTracks(prev => {
      const exists = prev.find(t => t.id === track.id);
      if (exists) {
        return prev.filter(t => t.id !== track.id);
      }
      return [...prev, track];
    });
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      pausePreview();
      setPreviewingSong(null);
    };
  }, [pausePreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <Music2 className="w-6 h-6 text-purple-600" />
            Préparation de la playlist
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex flex-1 overflow-hidden">
          {/* Panneau de recherche */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher une chanson..."
                  className="w-full px-4 py-3 pl-10 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500"
                  disabled={!isAuthenticated}
                />
                <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                {isLoading && (
                  <div className="absolute transform -translate-y-1/2 right-3 top-1/2">
                    <Loader className="w-5 h-5 text-purple-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* Messages d'erreur */}
              {searchError && (
                <div className="flex items-center gap-2 px-4 py-2 text-red-600 rounded-lg bg-red-50">
                  <AlertCircle className="w-4 h-4" />
                  {searchError}
                </div>
              )}

              {/* Résultats de recherche */}
              <div className="space-y-2">
                {searchResults.map(song => (
                  <SongItem
                    key={song.id}
                    song={song}
                    onPreview={handlePreview}
                    onToggle={toggleTrack}
                    isPlaying={previewingSong === song.id}
                    isSelected={selectedTracks.some(t => t.id === song.id)}
                  />
                ))}

                {searchTerm && !isLoading && searchResults.length === 0 && (
                  <div className="p-4 text-center text-gray-500 rounded-lg bg-gray-50">
                    Aucun résultat trouvé
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Liste sélectionnée */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Playlist ({selectedTracks.length} chansons)
                </h4>
                <button
                  onClick={() => {
                    const validSongs = selectedTracks
                      .filter(track => track.previewUrl)
                      .map(track => ({
                        id: track.id,
                        name: track.name,
                        artist: track.artist,
                        album: track.album,
                        previewUrl: track.previewUrl!,
                        spotifyUri: track.spotifyUri,
                        year: track.year
                      }));
                    onSave(validSongs);
                  }}
                  disabled={selectedTracks.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </button>
              </div>

              {/* Liste des pistes sélectionnées */}
              <div className="space-y-2">
                {selectedTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 font-medium text-purple-600 bg-purple-100 rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{track.name}</div>
                        <div className="text-sm text-gray-500">
                          {track.artist} • {track.album} • {track.year}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTrack(track)}
                      className="p-2 text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {selectedTracks.length === 0 && (
                  <div className="p-4 text-center text-gray-500 rounded-lg bg-gray-50">
                    Aucune chanson sélectionnée
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};