import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface DinoLoadingGameProps {
  compact?: boolean;
  progress?: number;
}

const DINO = String.fromCodePoint(0x1f996);
const CACTUS = String.fromCodePoint(0x1f335);
const START_X = 104;

export default function DinoLoadingGame({ compact = false, progress }: DinoLoadingGameProps): ReactElement {
  const [dinoY, setDinoY] = useState(0);
  const [obstacleX, setObstacleX] = useState(START_X);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const dinoYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstacleXRef = useRef(START_X);
  const scoreRef = useRef(0);
  const runningRef = useRef(true);
  const frameRef = useRef<number | null>(null);

  const restart = useCallback((): void => {
    dinoYRef.current = 0;
    velocityRef.current = 0;
    obstacleXRef.current = START_X;
    scoreRef.current = 0;
    runningRef.current = true;
    setDinoY(0);
    setObstacleX(START_X);
    setScore(0);
    setRunning(true);
  }, []);

  const jump = useCallback((): void => {
    if (!runningRef.current) {
      restart();
      return;
    }
    if (dinoYRef.current === 0) {
      velocityRef.current = compact ? 8.5 : 10;
    }
  }, [compact, restart]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  useEffect(() => {
    let previousTime = performance.now();
    const tick = (time: number): void => {
      const delta = Math.min((time - previousTime) / 16.67, 2);
      previousTime = time;

      if (runningRef.current) {
        if (dinoYRef.current > 0 || velocityRef.current > 0) {
          velocityRef.current -= 0.72 * delta;
          dinoYRef.current = Math.max(0, dinoYRef.current + velocityRef.current * delta);
          if (dinoYRef.current === 0) velocityRef.current = 0;
        }

        obstacleXRef.current -= (compact ? 0.72 : 0.62) * delta;
        if (obstacleXRef.current < -8) {
          obstacleXRef.current = START_X + Math.random() * 20;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }

        const hitObstacle = obstacleXRef.current > 10
          && obstacleXRef.current < 22
          && dinoYRef.current < (compact ? 20 : 24);
        if (hitObstacle) {
          runningRef.current = false;
          setRunning(false);
        }

        setDinoY(dinoYRef.current);
        setObstacleX(obstacleXRef.current);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [compact]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.code === 'Space' || event.code === 'ArrowUp') jump();
  };

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/20 bg-slate-950 text-slate-100 shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-primary">
        <span>Dino em espera</span>
        <span className="flex items-center gap-3 tabular-nums text-slate-300">
          {progress !== undefined && <span>Carregando: {progress}%</span>}
          <span>Pontos: {score}</span>
        </span>
      </div>
      <button
        type="button"
        aria-label="Pular obstaculo no jogo do dinossauro"
        onClick={jump}
        onKeyDown={handleKeyDown}
        className={`relative block w-full overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary ${
          compact ? 'h-32' : 'h-44'
        }`}
      >
        <span className="absolute left-[18%] top-7 h-2 w-12 rounded-full bg-white/5" />
        <span className="absolute right-[24%] top-12 h-2 w-16 rounded-full bg-white/5" />
        <span className="absolute bottom-7 left-0 h-px w-full bg-primary/35" />
        <span
          className={`absolute bottom-7 left-[12%] select-none leading-none drop-shadow-[0_0_10px_rgba(129,140,248,0.5)] ${
            compact ? 'text-3xl' : 'text-4xl'
          }`}
          style={{ transform: `translateY(-${dinoY}px) scaleX(-1)` }}
        >
          {DINO}
        </span>
        <span
          className={`absolute bottom-7 select-none leading-none ${compact ? 'text-2xl' : 'text-3xl'}`}
          style={{ left: `${obstacleX}%` }}
        >
          {CACTUS}
        </span>
        {!running && (
          <span className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-center text-xs text-slate-300 backdrop-blur-[1px]">
            <strong className="text-sm font-medium text-primary">Tente novamente</strong>
            Toque para reiniciar
          </span>
        )}
      </button>
      <p className="px-4 py-2 text-center text-[11px] text-slate-400">
        Pressione espaco, seta para cima ou toque para pular
      </p>
    </div>
  );
}
