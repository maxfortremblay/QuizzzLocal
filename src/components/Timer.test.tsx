import { render, screen } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer', () => {
  it('renders initial time correctly', () => {
    render(
      <Timer 
        duration={60} 
        isRunning={false}
        onComplete={() => {}}
      />
    );
    
    // Vérifie que le timer affiche 1:00
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('updates time when running', () => {
    jest.useFakeTimers();
    
    render(
      <Timer 
        duration={60} 
        isRunning={true}
        onComplete={() => {}}
      />
    );

    // Avance le temps de 1 seconde
    jest.advanceTimersByTime(1000);
    
    // Vérifie que le timer affiche 0:59
    expect(screen.getByText('0:59')).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  it('calls onComplete when finished', () => {
    jest.useFakeTimers();
    
    const onComplete = jest.fn();
    render(
      <Timer 
        duration={60} 
        isRunning={true}
        onComplete={onComplete}
      />
    );

    // Avance le temps pour finir le timer
    jest.advanceTimersByTime(60000);
    
    // Vérifie que onComplete a été appelé
    expect(onComplete).toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});