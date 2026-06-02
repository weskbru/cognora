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
    <div className={`w-full overflow-hidden rounded-2xl border border-amber-200 bg-white text-slate-700 shadow-lg shadow-amber-100/60 dark:border-primary/20 dark:bg-slate-950 dark:text-slate-100 dark:shadow-primary/10 ${
      compact ? 'max-w-md' : 'max-w-5xl'
    }`}>
      <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/80 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:border-white/10 dark:bg-slate-950 dark:text-primary">
        <span>Dino em espera</span>
        <span className="flex items-center gap-3 tabular-nums text-slate-600 dark:text-slate-300">
          {progress !== undefined && <span>Carregando: {progress}%</span>}
          <span>Pontos: {score}</span>
        </span>
      </div>
      <button
        type="button"
        aria-label="Pular obstaculo no jogo do dinossauro"
        onClick={jump}
        onKeyDown={handleKeyDown}
        className={`relative block w-full overflow-hidden bg-gradient-to-b from-sky-100 via-amber-50 to-orange-100 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 ${
          compact ? 'h-40' : 'h-72 md:h-80'
        }`}
      >
        <span className="absolute right-[12%] top-8 h-12 w-12 rounded-full bg-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.45)] dark:bg-indigo-200 dark:shadow-[0_0_28px_rgba(199,210,254,0.3)]" />
        <span className="absolute right-[13%] top-7 hidden h-12 w-12 translate-x-3 -translate-y-1 rounded-full bg-slate-950 dark:block" />
        <span className="absolute left-[9%] top-12 h-3 w-24 rounded-full bg-white/70 shadow-sm dark:bg-white/10" />
        <span className="absolute left-[14%] top-9 h-5 w-12 rounded-full bg-white/80 dark:bg-white/10" />
        <span className="absolute right-[31%] top-20 h-3 w-28 rounded-full bg-white/60 shadow-sm dark:bg-white/10" />
        <span className="absolute right-[37%] top-16 h-5 w-14 rounded-full bg-white/70 dark:bg-white/10" />
        <span className="absolute -bottom-4 left-[-8%] h-32 w-[45%] rotate-6 rounded-[50%] bg-orange-300/60 dark:bg-indigo-900/70" />
        <span className="absolute -bottom-6 left-[22%] h-28 w-[42%] -rotate-3 rounded-[50%] bg-amber-300/60 dark:bg-slate-800/90" />
        <span className="absolute -bottom-5 right-[-8%] h-36 w-[48%] -rotate-6 rounded-[50%] bg-orange-200/90 dark:bg-indigo-950/90" />
        <span className="absolute bottom-7 left-0 h-px w-full bg-amber-700/55 dark:bg-primary/35" />
        <span className="absolute bottom-7 left-[42%] h-8 w-1 rounded-t-full bg-emerald-700/60 dark:bg-emerald-500/40" />
        <span className="absolute bottom-7 left-[41.5%] h-3 w-3 -translate-x-2 rounded-full bg-emerald-600/60 dark:bg-emerald-500/35" />
        <span className="absolute bottom-7 right-[17%] h-12 w-1 rounded-t-full bg-emerald-700/60 dark:bg-emerald-500/40" />
        <span className="absolute bottom-16 right-[15.5%] h-3 w-4 rounded-full bg-emerald-600/60 dark:bg-emerald-500/35" />
        <span
          className={`absolute bottom-7 left-[12%] select-none leading-none drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] dark:drop-shadow-[0_0_10px_rgba(129,140,248,0.5)] ${
            compact ? 'text-4xl' : 'text-5xl'
          }`}
          style={{ transform: `translateY(-${dinoY}px) scaleX(-1)` }}
        >
          {DINO}
        </span>
        <span
          className={`absolute bottom-7 select-none leading-none ${compact ? 'text-3xl' : 'text-4xl'}`}
          style={{ left: `${obstacleX}%` }}
        >
          {CACTUS}
        </span>
        {!running && (
          <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-center text-xs text-slate-600 backdrop-blur-[1px] dark:bg-slate-950/70 dark:text-slate-300">
            <strong className="text-sm font-medium text-primary">Tente novamente</strong>
            Toque para reiniciar
          </span>
        )}
      </button>
      <p className="bg-amber-50/80 px-4 py-2 text-center text-[11px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Pressione espaco, seta para cima ou toque para pular
      </p>
    </div>
  );
}
