import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number;
  isRunning: boolean;
  onComplete: () => void;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({
  duration,
  isRunning,
  onComplete,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsCompleted(true);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  useEffect(() => {
    setTimeLeft(duration);
    setIsCompleted(false);
  }, [duration]);

  // Calcul du cercle de progression
  const circumference = 2 * Math.PI * 45; // rayon de 45
  const offset = circumference - (timeLeft / duration) * circumference;

  return (
    <div className={`relative ${className}`}>
      <svg className="w-32 h-32 transform -rotate-90">
        {/* Cercle de fond */}
        <circle
          cx="64"
          cy="64"
          r="45"
          strokeWidth="8"
          className="fill-none stroke-gray-200"
        />
        {/* Cercle de progression */}
        <circle
          cx="64"
          cy="64"
          r="45"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none transition-all duration-1000 
            ${isCompleted ? 'stroke-red-500' : 'stroke-purple-600'}`}
          strokeLinecap="round"
        />
      </svg>

      {/* Affichage du temps */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Clock className={`w-6 h-6 mb-1 ${
          isCompleted ? 'text-red-500' : 'text-purple-600'
        }`} />
        <span className="text-2xl font-bold">
          {Math.ceil(timeLeft)}
        </span>
      </div>
    </div>
  );
};