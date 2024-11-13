/**
 * Utilitaires pour la gestion du temps dans le jeu
 */

interface TimerCallback {
    onTick?: (timeLeft: number) => void;
    onComplete?: () => void;
  }
  
  /**
   * Crée un timer précis avec requestAnimationFrame
   */
  export const createPreciseTimer = (
    duration: number,
    { onTick, onComplete }: TimerCallback = {}
  ): {
    start: () => void;
    pause: () => void;
    reset: () => void;
    stop: () => void;
  } => {
    let startTime: number | null = null;
    let pausedTimeLeft: number | null = null;
    let animationFrameId: number | null = null;
  
    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      
      const elapsed = timestamp - startTime;
      const timeLeft = Math.max(0, duration - elapsed);
  
      onTick?.(timeLeft);
  
      if (timeLeft > 0) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
  
    return {
      start: () => {
        if (pausedTimeLeft) {
          startTime = Date.now() - (duration - pausedTimeLeft);
          pausedTimeLeft = null;
        }
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(tick);
        }
      },
  
      pause: () => {
        if (animationFrameId && startTime) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          pausedTimeLeft = duration - (Date.now() - startTime);
        }
      },
  
      reset: () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        startTime = null;
        pausedTimeLeft = null;
        animationFrameId = null;
      },
  
      stop: () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        onComplete?.();
      }
    };
  };
  
  /**
   * Calcule le pourcentage de progression
   */
  export const calculateProgress = (
    current: number,
    total: number
  ): number => {
    return Math.min(100, Math.max(0, (current / total) * 100));
  };
  
  /**
   * Formate le temps restant en secondes
   */
  export const formatTimeLeft = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return remainingSeconds.toString();
  };
  
  /**
   * Crée un délai précis
   */
  export const createPreciseDelay = (ms: number): Promise<void> => {
    let timeoutId: NodeJS.Timeout;
    let startTime: number;
  
    return new Promise((resolve, reject) => {
      startTime = Date.now();
      
      const check = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= ms) {
          resolve();
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      };
  
      // Vérifie toutes les 10ms pour plus de précision
      const intervalId = setInterval(check, 10);
  
      // Failsafe timeout
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        resolve();
      }, ms + 100);
    });
  };
  
  /**
   * Convertit une durée en millisecondes en objet formaté
   */
  export const parseMilliseconds = (ms: number): {
    minutes: number;
    seconds: number;
    milliseconds: number;
  } => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
  
    return {
      minutes,
      seconds,
      milliseconds
    };
  };
  
  /**
   * Crée un chronomètre simple
   */
  export const createStopwatch = () => {
    let startTime: number | null = null;
    let elapsedTime = 0;
    let running = false;
  
    return {
      start: () => {
        if (!running) {
          running = true;
          startTime = Date.now() - elapsedTime;
        }
      },
  
      stop: () => {
        if (running && startTime) {
          running = false;
          elapsedTime = Date.now() - startTime;
        }
      },
  
      reset: () => {
        elapsedTime = 0;
        startTime = null;
        running = false;
      },
  
      getElapsed: (): number => {
        if (!running || !startTime) return elapsedTime;
        return Date.now() - startTime;
      },
  
      isRunning: (): boolean => running
    };
  };
  
  /**
   * Vérifie si un temps est écoulé
   */
  export const isTimeElapsed = (startTime: number, duration: number): boolean => {
    return Date.now() - startTime >= duration;
  };
  
  /**
   * Calcule le temps restant
   */
  export const getTimeRemaining = (endTime: number): number => {
    return Math.max(0, endTime - Date.now());
  };
  
  /**
   * Crée un timer avec des étapes
   */
  export interface TimerStep {
    duration: number;
    onStart?: () => void;
    onComplete?: () => void;
  }
  
  export const createStepTimer = (steps: TimerStep[]) => {
    let currentStepIndex = 0;
    let timer: ReturnType<typeof createPreciseTimer> | null = null;
  
    const startNextStep = async () => {
      if (currentStepIndex >= steps.length) return;
  
      const step = steps[currentStepIndex];
      step.onStart?.();
  
      timer = createPreciseTimer(step.duration, {
        onComplete: () => {
          step.onComplete?.();
          currentStepIndex++;
          startNextStep();
        }
      });
  
      timer.start();
    };
  
    return {
      start: () => {
        currentStepIndex = 0;
        startNextStep();
      },
  
      pause: () => timer?.pause(),
      resume: () => timer?.start(),
      
      stop: () => {
        timer?.stop();
        currentStepIndex = steps.length;
      },
  
      getCurrentStep: () => currentStepIndex
    };
  };