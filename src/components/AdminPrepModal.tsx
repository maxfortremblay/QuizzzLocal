import React, { useState, useCallback, useEffect } from 'react';
import { 
  Music2, Search, Play, Pause, X, Plus, 
  AlertCircle, Save, Loader
} from 'lucide-react';
import { useSpotifyContext } from '../contexts/SpotifyContext';
import { Song, SpotifyTrack, SpotifyApiTrack } from '../types/spotify';

interface AdminPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tracks: SpotifyApiTrack[]) => void;
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

const convertSpotifyTrackToSong = (track: SpotifyApiTrack): Song | null => {
  if (!track.preview_url) return null;
  
  try {
    const year = parseInt(track.album.release_date.split('-')[0], 10);
    
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name),
      album: track.album.name,
      year: isNaN(year) ? undefined : year,
      previewUrl: track.preview_url,
      uri: track.uri
    };
  } catch (err) {
    console.error('Erreur de conversion:', err);
    return null;
  }
};

const AdminPrepModal: React.FC<AdminPrepModalProps> = ({ isOpen, onClose, onSave }) => {
  const { searchTracks } = useSpotifyContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<SpotifyApiTrack[]>([]);
  const [playingTrack, setPlayingTrack] = useState<SpotifyTrack | null>(null);

  const convertToApiTrack = (track: SpotifyTrack): SpotifyApiTrack => ({
    id: track.id,
    name: track.name,
    preview_url: track.previewUrl,
    artists: track.artists.map(artist => ({
      id: '', // Si l'ID n'est pas disponible, utiliser une chaîne vide
      name: typeof artist === 'string' ? artist : artist.name
    })),
    album: {
      id: '', // Si l'ID n'est pas disponible, utiliser une chaîne vide
      name: track.album.name,
      release_date: track.year || '',
      images: track.album.images
    },
    uri: track.uri
  });

  const handleSaveSelection = () => {
    const validTracks = selectedTracks.map(convertToApiTrack);
    onSave(validTracks);
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