import React, { useState, useCallback, useEffect } from 'react';
import { 
  Music2, Search, Play, Pause, X, Plus, 
  AlertCircle, Save
} from 'lucide-react';
import { useSpotifyContext } from '../contexts/SpotifyContext';
import { Song, SpotifyTrack } from '../types/spotify';

// Types
interface AdminPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songs: Song[]) => void;  // Type explicite pour songs
}

export const AdminPrepModal: React.FC<AdminPrepModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const {
    state: { isLoading, error },
    searchTracks,
    playPreview,
    pausePreview
  } = useSpotifyContext();

  // États avec types mis à jour
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<SpotifyTrack[]>([]);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [previewingSong, setPreviewingSong] = useState<string | null>(null);

  // Fonction utilitaire de conversion sûre
  const convertToSong = (track: SpotifyTrack): Song | null => {
    if (!track.previewUrl) return null;
    return {
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      previewUrl: track.previewUrl,
      spotifyUri: track.spotifyUri,
      year: track.year
    };
  };

  // Handler avec validation stricte
  const handleSave = () => {
    const validSongs = selectedTracks
      .map(convertToSong)
      .filter((song): song is Song => song !== null);
    onSave(validSongs);
  };

  // Recherche avec debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const debounceTimeout = setTimeout(async () => {
      try {
        const results = await searchTracks(searchTerm);
        setSearchResults(results);
      } catch (err) {
        // Les erreurs sont gérées par le contexte
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, searchTracks]);

  // Gestion prévisualisation audio
  const handlePreview = useCallback((song: SpotifyTrack) => {
    if (!song.previewUrl) return;

    if (previewingSong === song.id) {
      pausePreview();
      setPreviewingSong(null);
    } else {
      playPreview(song.previewUrl);
      setPreviewingSong(song.id); 
    }
  }, [previewingSong, playPreview, pausePreview]);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => pausePreview();
  }, [pausePreview]);

  // Sélection de chanson avec vérification
  const toggleSong = useCallback((track: SpotifyTrack) => {
    if (!track.previewUrl) return; // Ignore les pistes sans preview
    
    setSelectedTracks(prev => {
      const exists = prev.find(s => s.id === track.id);
      if (exists) {
        return prev.filter(s => s.id !== track.id);
      }
      return [...prev, track];
    });
  }, []);

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
          <button onClick={onClose} className="p-2 text-gray-500 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex flex-1 overflow-hidden">
          {/* Panneau de recherche */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher une chanson..."
                  className="w-full px-4 py-3 pl-10 border rounded-lg"
                />
                <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                {isLoading && (
                  <div className="absolute transform -translate-y-1/2 right-3 top-1/2">
                    <div className="w-4 h-4 border-2 border-purple-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-2 text-red-600 rounded-lg bg-red-50">
                  <AlertCircle className="w-4 h-4" />
                  {error.message}
                </div>
              )}

              <div className="space-y-2">
                {searchResults.map(song => (
                  <div key={song.id} className="flex items-center justify-between p-4 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePreview(song)}
                        className="p-2 transition-colors rounded-full hover:bg-purple-100"
                      >
                        {previewingSong === song.id ? (
                          <Pause className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Play className="w-5 h-5 text-purple-600" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium">{song.name}</div>
                        <div className="text-sm text-gray-500">{song.artist}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSong(song)} 
                      className="p-2 text-purple-600 rounded-lg hover:bg-purple-100"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des chansons sélectionnées */} 
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Playlist ({selectedTracks.length} chansons)
                </h4>
                <button
                  onClick={handleSave}
                  disabled={selectedTracks.length < 1}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </button>
              </div>

              <div className="space-y-2">
                {selectedTracks.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 font-medium text-purple-600 bg-purple-100 rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{song.name}</div>
                        <div className="text-sm text-gray-500">
                          {song.artist} • {song.album} • {song.year}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSong(song)}
                      className="p-2 text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};