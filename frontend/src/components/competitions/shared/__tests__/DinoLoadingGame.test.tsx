import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DinoLoadingGame from '../DinoLoadingGame';

const frameCallbacks: FrameRequestCallback[] = [];

beforeEach(() => {
  frameCallbacks.length = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function runNextFrame(time: number): void {
  const callback = frameCallbacks.shift();
  if (!callback) throw new Error('Frame callback not scheduled.');
  callback(time);
}

describe('DinoLoadingGame', () => {
  it('moves the cactus continuously with animation frames', () => {
    render(<DinoLoadingGame progress={40} />);
    const cactus = screen.getByTestId('cactus');
    const initialTransform = cactus.style.transform;

    runNextFrame(0);
    runNextFrame(16);

    expect(cactus.style.transform).not.toBe(initialTransform);
    expect(screen.getByText('LOAD 040%')).toBeInTheDocument();
  });

  it('moves the dino upward after clicking the game area', () => {
    render(<DinoLoadingGame />);
    const dino = screen.getByTestId('dino');

    fireEvent.click(screen.getByRole('button', { name: 'Pular ou reiniciar o jogo do dinossauro' }));
    runNextFrame(0);
    runNextFrame(16);
    runNextFrame(32);

    expect(dino.style.transform).toMatch(/translate3d\(0, -[1-9]/);
  });
});
