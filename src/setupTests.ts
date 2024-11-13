import '@testing-library/jest-dom';

// Mock de l'API Audio
class AudioMock {
  play() { return Promise.resolve(); }
  pause() {}
}
global.Audio = AudioMock as any;

// Mock de fetch
global.fetch = jest.fn();

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });