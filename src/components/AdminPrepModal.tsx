import React, { useState, useCallback } from 'react';
import { Play, Pause, X, Plus, Search, Loader } from 'lucide-react';
import { SpotifyTrack, Song } from '../types/spotify';
import { spotifyService } from '../contexts/spotifyService';

interface AdminPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (songs: Song[]) => void;
}

const AdminPrepModal: React.FC<AdminPrepModalProps> = ({ isOpen, onClose, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await spotifyService.searchTracks(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      // Gérer l'erreur si nécessaire
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const handleSaveSelection = () => {
    const validSongs = selectedTracks
      .map(convertSpotifyTrackToSong)
      .filter((song): song is Song => song !== null);
    onSave(validSongs);
    onClose();
  };

  return (
    <div className={`modal ${isOpen ? 'open' : ''}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Préparer la playlist</h2>
          <button onClick={onClose} className="close-button">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          <div className="search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher des chansons sur Spotify"
              className="search-input"
            />
            <button onClick={handleSearch} className="search-button">
              <Search className="w-5 h-5" />
            </button>
          </div>
          {isLoading ? (
            <Loader className="w-6 h-6 animate-spin" />
          ) : (
            <div className="search-results">
              {searchResults.map((track) => (
                <SongItem
                  key={track.id}
                  song={track}
                  onPreview={() => spotifyService.playPreview(track)}
                  onToggle={() => setSelectedTracks((prev) =>
                    prev.includes(track)
                      ? prev.filter((t) => t.id !== track.id)
                      : [...prev, track]
                  )}
                  isPlaying={spotifyService.getCurrentTrack()?.id === track.id}
                  isSelected={selectedTracks.includes(track)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            onClick={handleSaveSelection}
            disabled={selectedTracks.length === 0}
            className="save-button"
          >
            Enregistrer ({selectedTracks.length})
          </button>
        </div>
      </div>
    </div>
  );
};

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
          {song.artists} • {song.album}
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

const convertSpotifyTrackToSong = (track: SpotifyTrack): Song | null => {
  if (!track.previewUrl) return null;

  return {
    id: track.id,
    name: track.name,
    artist: track.artists,
    album: track.album,
    previewUrl: track.previewUrl,
    spotifyUri: track.spotifyUri,
    year: track.year
  };
};

export default AdminPrepModal;