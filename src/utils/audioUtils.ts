/**
 * Utilitaires pour la gestion audio du jeu
 */

/**
 * Vérifie si l'API Web Audio est disponible
 */
export const isWebAudioSupported = (): boolean => {
    return typeof window !== 'undefined' && 'AudioContext' in window;
  };
  
  interface AudioFadeOptions {
    startVolume: number;
    endVolume: number;
    duration: number;
    onUpdate?: (volume: number) => void;
  }
  
  /**
   * Crée un fade audio (in/out)
   */
  export const createAudioFade = (
    audioElement: HTMLAudioElement,
    options: AudioFadeOptions
  ): Promise<void> => {
    const { startVolume, endVolume, duration, onUpdate } = options;
    const startTime = Date.now();
  
    return new Promise((resolve) => {
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentVolume = startVolume + (endVolume - startVolume) * progress;
        audioElement.volume = Math.max(0, Math.min(1, currentVolume));
        
        onUpdate?.(currentVolume);
  
        if (progress >= 1) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, 50); // 20 updates per second
    });
  };
  
  /**
   * Convertit les secondes en format mm:ss
   */
  export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  /**
   * Précharge un fichier audio
   */
  export const preloadAudio = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => resolve();
      audio.onerror = () => reject(new Error('Erreur de chargement audio'));
      
      audio.src = url;
    });
  };
  
  /**
   * Vérifie si un fichier audio peut être lu
   */
  export const canPlayAudio = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
  
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000);
  
      audio.oncanplay = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
  
      audio.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };
  
      audio.src = url;
    });
  };
  
  /**
   * Gestion des erreurs audio courantes
   */
  export const handleAudioError = (error: unknown): string => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Interaction utilisateur requise pour lire l\'audio';
        case 'NotSupportedError':
          return 'Format audio non supporté';
        case 'AbortError':
          return 'Lecture audio interrompue';
        default:
          return 'Erreur de lecture audio';
      }
    }
    return 'Erreur inconnue';
  };