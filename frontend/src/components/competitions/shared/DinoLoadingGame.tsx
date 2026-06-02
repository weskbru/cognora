import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RotateCcw } from 'lucide-react';

interface DinoLoadingGameProps {
  compact?: boolean;
  progress?: number;
}

const GRAVITY = 2200;
const DINO_LEFT_RATIO = 0.12;

function DinoSprite({ runningFrame }: { runningFrame: number }): ReactElement {
  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 44 47" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M22 0h15v3h4v3h3v12H27v3h10v4H25v4h-3v3h-3v3h-3v3h-3v9H8v-6H5v-6H2v-5H0v-9h4v5h4v3h7v-3h3V8h4z"
      />
      <path fill="currentColor" d={runningFrame === 0 ? 'M8 38h5v6H8zM18 36h5v11h-5z' : 'M7 38h6v9H7zM18 36h5v7h-5z'} />
      <rect x="32" y="4" width="3" height="3" fill="#f7f7f7" className="dark:fill-slate-950" />
    </svg>
  );
}

function CactusSprite(): ReactElement {
  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 25 50" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M9 0h7v19h3v-8h6v15h-6v5h-3v19H9V28H5v-5H0V10h6v12h3z"
      />
    </svg>
  );
}

function CloudSprite({ className }: { className: string }): ReactElement {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 46 14" shapeRendering="crispEdges">
      <path fill="none" stroke="currentColor" d="M0 12h45M4 11V8h4V5h7V3h13v2h7v3h6v3" />
    </svg>
  );
}

function formatScore(score: number): string {
  return String(score).padStart(5, '0');
}

export default function DinoLoadingGame({ compact = false, progress }: DinoLoadingGameProps): ReactElement {
  const gameRef = useRef<HTMLButtonElement>(null);
  const dinoRef = useRef<HTMLSpanElement>(null);
  const obstacleRef = useRef<HTMLSpanElement>(null);
  const groundRef = useRef<HTMLSpanElement>(null);
  const frameRequestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const dinoYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstacleXRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const runningRef = useRef(true);
  const scoreRef = useRef(0);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [runningFrame, setRunningFrame] = useState(0);

  const gameWidth = useCallback((): number => gameRef.current?.clientWidth || (compact ? 448 : 960), [compact]);

  const drawFrame = useCallback((): void => {
    if (dinoRef.current) {
      dinoRef.current.style.transform = `translate3d(0, -${dinoYRef.current}px, 0)`;
    }
    if (obstacleRef.current) {
      obstacleRef.current.style.transform = `translate3d(${obstacleXRef.current}px, 0, 0)`;
    }
    if (groundRef.current) {
      groundRef.current.style.backgroundPositionX = `${groundOffsetRef.current}px`;
    }
  }, []);

  const resetObstacle = useCallback((): void => {
    obstacleXRef.current = gameWidth() + 80 + Math.random() * 120;
  }, [gameWidth]);

  const restart = useCallback((): void => {
    dinoYRef.current = 0;
    velocityRef.current = 0;
    groundOffsetRef.current = 0;
    scoreRef.current = 0;
    runningRef.current = true;
    setScore(0);
    setRunning(true);
    resetObstacle();
    drawFrame();
  }, [drawFrame, resetObstacle]);

  const jump = useCallback((): void => {
    if (!runningRef.current) {
      restart();
      return;
    }
    if (dinoYRef.current === 0) {
      velocityRef.current = compact ? 700 : 780;
      dinoYRef.current = 1;
      drawFrame();
    }
  }, [compact, drawFrame, restart]);

  useEffect(() => {
    resetObstacle();
    drawFrame();
  }, [drawFrame, resetObstacle]);

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
    const interval = window.setInterval(() => {
      if (runningRef.current && dinoYRef.current === 0) {
        setRunningFrame(current => (current + 1) % 2);
      }
    }, 120);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = (time: number): void => {
      const previousTime = previousTimeRef.current ?? time;
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTimeRef.current = time;

      if (runningRef.current) {
        if (dinoYRef.current > 0 || velocityRef.current > 0) {
          velocityRef.current -= GRAVITY * delta;
          dinoYRef.current = Math.max(0, dinoYRef.current + velocityRef.current * delta);
          if (dinoYRef.current === 0) velocityRef.current = 0;
        }

        const speed = compact ? 310 : 390;
        obstacleXRef.current -= speed * delta;
        groundOffsetRef.current -= speed * delta;

        if (obstacleXRef.current < -40) {
          resetObstacle();
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }

        const dinoLeft = gameWidth() * DINO_LEFT_RATIO;
        const hitObstacle = obstacleXRef.current < dinoLeft + 40
          && obstacleXRef.current > dinoLeft - 18
          && dinoYRef.current < 42;
        if (hitObstacle) {
          runningRef.current = false;
          setRunning(false);
          setHighScore(current => Math.max(current, scoreRef.current));
        }

        drawFrame();
      }

      frameRequestRef.current = requestAnimationFrame(tick);
    };

    frameRequestRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
    };
  }, [compact, drawFrame, gameWidth, resetObstacle]);

  return (
    <div className={`w-full overflow-hidden border border-slate-200 bg-[#f7f7f7] text-[#535353] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 ${
      compact ? 'max-w-md' : 'max-w-5xl'
    }`}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-2 font-mono text-[10px] tracking-[0.18em] dark:border-slate-800">
        <span>DINO GAME</span>
        <span className="flex items-center gap-4 tabular-nums">
          {progress !== undefined && <span>LOAD {String(progress).padStart(3, '0')}%</span>}
          <span>HI {formatScore(highScore)} {formatScore(score)}</span>
        </span>
      </div>

      <button
        ref={gameRef}
        type="button"
        aria-label="Pular ou reiniciar o jogo do dinossauro"
        onClick={jump}
        className={`relative block w-full overflow-hidden bg-[#f7f7f7] text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 dark:bg-slate-950 dark:focus:ring-slate-600 ${
          compact ? 'h-44' : 'h-72 md:h-80'
        }`}
      >
        <CloudSprite className="absolute left-[21%] top-[27%] h-[14px] w-[46px] text-slate-300 dark:text-slate-700" />
        <CloudSprite className="absolute right-[24%] top-[38%] h-[14px] w-[46px] text-slate-300 dark:text-slate-700" />

        <span className="absolute bottom-12 left-[8%] right-[8%] h-px bg-[#535353] dark:bg-slate-400" />
        <span
          ref={groundRef}
          className="absolute bottom-10 left-[8%] right-[8%] h-1 opacity-60"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 11px)' }}
        />
        <span
          ref={dinoRef}
          data-testid="dino"
          className={`absolute bottom-12 left-[12%] block ${compact ? 'h-[47px] w-[44px]' : 'h-[56px] w-[53px]'}`}
        >
          <DinoSprite runningFrame={runningFrame} />
        </span>
        <span
          ref={obstacleRef}
          data-testid="cactus"
          className={`absolute bottom-12 left-0 block ${compact ? 'h-[50px] w-[25px]' : 'h-[60px] w-[30px]'}`}
        >
          <CactusSprite />
        </span>

        {!running && (
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-sm tracking-[0.45em] sm:text-base">GAME OVER</span>
            <span className="flex h-8 w-9 items-center justify-center rounded-sm bg-[#535353] text-[#f7f7f7] dark:bg-slate-300 dark:text-slate-950">
              <RotateCcw className="h-5 w-5" strokeWidth={3} />
            </span>
          </span>
        )}
      </button>

      <p className="border-t border-slate-200 px-4 py-2 text-center font-mono text-[10px] tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-500">
        ESPAÇO, SETA PARA CIMA OU TOQUE PARA PULAR
      </p>
    </div>
  );
}
