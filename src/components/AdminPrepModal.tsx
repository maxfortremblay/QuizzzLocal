import React, { useState, useCallback, useEffect } from 'react';
import { 
  Music2, Search, Play, Pause, X, Plus, 
  AlertCircle, Save, Loader} from 'lucide-react';
import { Song, SpotifyTrack, SpotifyApiTrack } from '../types/spotify';
import { spotifyService } from '../contexts/spotifyService';

interface AdminPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tracks: SpotifyTrack[]) => void;
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

const convertSpotifyTrackToSong = (track: SpotifyTrack): Song | null => {
  if (!track.previewUrl) return null;

  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map(artist => artist.name),
    album: track.album.name,
    year: track.year ? parseInt(track.year, 10) : undefined,
    previewUrl: track.previewUrl,
    uri: track.uri
  };
};

const convertToApiTrack = (track: SpotifyTrack): SpotifyApiTrack => ({
  id: track.id,
  name: track.name,
  preview_url: track.previewUrl,
  artists: track.artists.map(artist => ({
    id: 'unknown',
    name: artist.name
  })),
  album: {
    id: 'unknown',
    name: track.album.name,
    release_date: track.year?.toString() || '',
    images: track.album.images.map(image => ({
      url: image.url,
      height: 300, // Valeurs par défaut
      width: 300
    }))
  },
  uri: track.uri
});

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
    <div className="modal">
      {/* ... autres éléments du modal ... */}
      
      {searchResults.map(track => (
        <div key={track.id} className="track-item">
          <div className="track-info">
            <div className="font-medium">{track.name}</div>
            <div className="text-sm text-gray-500">
              {track.artists.map(a => a.name).join(', ')} • {track.album.name} • {track.year}
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={handleSaveSelection}
        disabled={selectedTracks.length === 0}
        className="save-button"
      >
        Enregistrer ({selectedTracks.length})
      </button>
    </div>
  );
};

export default AdminPrepModal;