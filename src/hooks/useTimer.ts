import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerOptions {
  initialDuration: number;
  tickInterval?: number;
  autoStart?: boolean;
  onTick?: (timeLeft: number) => void;
  onComplete?: () => void;
}

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
}

export const useTimer = ({
  initialDuration,
  tickInterval = 1000,
  autoStart = false,
  onTick,
  onComplete
}: UseTimerOptions) => {
  const [state, setState] = useState<TimerState>({
    timeLeft: initialDuration,
    isRunning: autoStart,
    isPaused: false,
    progress: 1
  });

  const timerRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const start = useCallback(() => {
    if (state.timeLeft <= 0) return;

    startTimeRef.current = Date.now() - (initialDuration - state.timeLeft);
    setState(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, [state.timeLeft, initialDuration]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    if (startTimeRef.current) {
      startTimeRef.current = Date.now() - (initialDuration - state.timeLeft);
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.timeLeft, initialDuration]);

  const reset = useCallback((newDuration?: number) => {
    setState({
      timeLeft: newDuration ?? initialDuration,
      isRunning: false,
      isPaused: false,
      progress: 1
    });
    startTimeRef.current = undefined;
  }, [initialDuration]);

  // Timer logic
  useEffect(() => {
    if (!state.isRunning || state.isPaused || state.timeLeft <= 0) return;

    const tick = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const newTimeLeft = Math.max(0, initialDuration - elapsed);
      const newProgress = newTimeLeft / initialDuration;

      setState(prev => ({
        ...prev,
        timeLeft: newTimeLeft,
        progress: newProgress
      }));

      onTick?.(newTimeLeft);

      if (newTimeLeft <= 0) {
        onComplete?.();
        setState(prev => ({ ...prev, isRunning: false }));
      }
    };

    timerRef.current = window.setInterval(tick, tickInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    state.isRunning,
    state.isPaused,
    state.timeLeft,
    initialDuration,
    tickInterval,
    onTick,
    onComplete
  ]);

  return {
    ...state,
    start,
    pause,
    resume,
    reset,
    formatTime: (time: number = state.timeLeft) => {
      const minutes = Math.floor(time / 60000);
      const seconds = Math.floor((time % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };
};