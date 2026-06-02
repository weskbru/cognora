import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArrowDown, RotateCcw } from 'lucide-react';

interface DinoLoadingGameProps {
  compact?: boolean;
  progress?: number;
}

type ObstacleKind = 'cactus' | 'pterodactyl';

interface ObstacleSpec {
  kind: ObstacleKind;
}

interface Obstacle extends ObstacleSpec {
  id: number;
  x: number;
}

const GRAVITY = 2200;
const DINO_LEFT_RATIO = 0.12;

export function selectObstacleWave(score: number, random = Math.random): ObstacleSpec[] {
  const roll = random();

  if (score >= 2 && roll < 0.28) {
    return [{ kind: 'pterodactyl' }];
  }

  const cactusCount = score >= 5 && roll > 0.72
    ? 3
    : score >= 2 && roll > 0.48
      ? 2
      : 1;

  return Array.from({ length: cactusCount }, () => ({ kind: 'cactus' as const }));
}

function DinoSprite({ ducking, runningFrame }: { ducking: boolean; runningFrame: number }): ReactElement {
  if (ducking) {
    return (
      <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 59 30" shapeRendering="crispEdges">
        <path fill="currentColor" d="M0 9h10V5h29V0h14v3h4v3h2v10H43v3H32v5H12v-3H4v-4H0z" />
        <path fill="currentColor" d={runningFrame === 0 ? 'M14 23h7v7h-7zM31 21h7v6h-7z' : 'M12 23h7v5h-7zM32 21h7v9h-7z'} />
        <rect x="48" y="4" width="3" height="3" fill="#f7f7f7" className="dark:fill-slate-950" />
      </svg>
    );
  }

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
      <path fill="currentColor" d="M9 0h7v19h3v-8h6v15h-6v5h-3v19H9V28H5v-5H0V10h6v12h3z" />
    </svg>
  );
}

function PterodactylSprite({ wingFrame }: { wingFrame: number }): ReactElement {
  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 46 40" shapeRendering="crispEdges">
      <path fill="currentColor" d="M0 18h8v-4h10v-4h9v3h7v4h12v5H33v4h-8v4H13v-4H8v-4H0z" />
      <path fill="currentColor" d={wingFrame === 0 ? 'M14 10V5h5V0h5v14h-6v4h-5z' : 'M15 26h6v4h5v10h-6v-5h-5z'} />
      <rect x="30" y="16" width="3" height="3" fill="#f7f7f7" className="dark:fill-slate-950" />
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
  const obstacleRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const groundRef = useRef<HTMLSpanElement>(null);
  const frameRequestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const dinoYRef = useRef(0);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextObstacleIdRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const runningRef = useRef(true);
  const duckingRef = useRef(false);
  const scoreRef = useRef(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [running, setRunning] = useState(true);
  const [ducking, setDuckingState] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [runningFrame, setRunningFrame] = useState(0);

  const gameWidth = useCallback((): number => gameRef.current?.clientWidth || (compact ? 448 : 960), [compact]);

  const syncObstacles = useCallback((): void => {
    setObstacles([...obstaclesRef.current]);
  }, []);

  const drawFrame = useCallback((): void => {
    if (dinoRef.current) {
      dinoRef.current.style.transform = `translate3d(0, -${dinoYRef.current}px, 0)`;
    }
    for (const obstacle of obstaclesRef.current) {
      const element = obstacleRefs.current[obstacle.id];
      if (element) {
        element.style.transform = `translate3d(${obstacle.x}px, 0, 0)`;
      }
    }
    if (groundRef.current) {
      groundRef.current.style.backgroundPositionX = `${groundOffsetRef.current}px`;
    }
  }, []);

  const setDucking = useCallback((value: boolean): void => {
    if (duckingRef.current === value) return;
    duckingRef.current = value;
    setDuckingState(value);
  }, []);

  const addObstacleWave = useCallback((startX = gameWidth() + 80): void => {
    const spacing = compact ? 42 : 52;
    const wave = selectObstacleWave(scoreRef.current);
    const additions = wave.map((spec, index): Obstacle => ({
      ...spec,
      id: nextObstacleIdRef.current++,
      x: startX + index * spacing,
    }));
    obstaclesRef.current = [...obstaclesRef.current, ...additions];
    syncObstacles();
  }, [compact, gameWidth, syncObstacles]);

  const restart = useCallback((): void => {
    dinoYRef.current = 0;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    obstacleRefs.current = {};
    nextObstacleIdRef.current = 0;
    groundOffsetRef.current = 0;
    scoreRef.current = 0;
    runningRef.current = true;
    setDucking(false);
    setScore(0);
    setRunning(true);
    addObstacleWave();
    drawFrame();
  }, [addObstacleWave, drawFrame, setDucking]);

  const jump = useCallback((): void => {
    if (!runningRef.current) {
      restart();
      return;
    }
    setDucking(false);
    if (dinoYRef.current === 0) {
      velocityRef.current = compact ? 700 : 780;
      dinoYRef.current = 1;
      drawFrame();
    }
  }, [compact, drawFrame, restart, setDucking]);

  useEffect(() => {
    addObstacleWave();
    drawFrame();
  }, [addObstacleWave, drawFrame]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        setDucking(true);
      }
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent): void => {
      if (event.code === 'ArrowDown') {
        setDucking(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, setDucking]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (runningRef.current) {
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

        const speed = (compact ? 310 : 390) + Math.min(scoreRef.current * 16, 210);
        groundOffsetRef.current -= speed * delta;
        for (const obstacle of obstaclesRef.current) {
          obstacle.x -= speed * delta;
        }

        const remainingObstacles = obstaclesRef.current.filter(obstacle => obstacle.x > -80);
        const removedCount = obstaclesRef.current.length - remainingObstacles.length;
        let obstaclesChanged = removedCount > 0;
        if (removedCount > 0) {
          obstaclesRef.current = remainingObstacles;
          scoreRef.current += removedCount;
          setScore(scoreRef.current);
        }

        const rightmostObstacle = obstaclesRef.current.reduce((rightmost, obstacle) => Math.max(rightmost, obstacle.x), -Infinity);
        const spawnGap = Math.max((compact ? 220 : 300) - scoreRef.current * 5, compact ? 145 : 190);
        if (rightmostObstacle < gameWidth() - spawnGap) {
          addObstacleWave(gameWidth() + 70);
          obstaclesChanged = true;
        }

        const dinoLeft = gameWidth() * DINO_LEFT_RATIO;
        const dinoRight = dinoLeft + (duckingRef.current ? 58 : 44);
        const hitObstacle = obstaclesRef.current.some(obstacle => {
          const obstacleWidth = obstacle.kind === 'pterodactyl' ? 46 : 25;
          const overlapsHorizontally = obstacle.x < dinoRight && obstacle.x + obstacleWidth > dinoLeft;
          if (!overlapsHorizontally) return false;
          if (obstacle.kind === 'pterodactyl') {
            return dinoYRef.current < 58 && !duckingRef.current;
          }
          return dinoYRef.current < 42;
        });
        if (hitObstacle) {
          runningRef.current = false;
          setRunning(false);
          setHighScore(current => Math.max(current, scoreRef.current));
        }

        if (obstaclesChanged) syncObstacles();
        drawFrame();
      }

      frameRequestRef.current = requestAnimationFrame(tick);
    };

    frameRequestRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRequestRef.current !== null) cancelAnimationFrame(frameRequestRef.current);
    };
  }, [addObstacleWave, compact, drawFrame, gameWidth, syncObstacles]);

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
          data-ducking={ducking}
          data-testid="dino"
          className={`absolute bottom-12 left-[12%] block ${ducking ? 'h-[30px] w-[59px]' : compact ? 'h-[47px] w-[44px]' : 'h-[56px] w-[53px]'}`}
        >
          <DinoSprite ducking={ducking} runningFrame={runningFrame} />
        </span>
        {obstacles.map(obstacle => (
          <span
            key={obstacle.id}
            ref={(element) => {
              obstacleRefs.current[obstacle.id] = element;
            }}
            data-testid={obstacle.kind}
            className={`absolute left-0 block ${
              obstacle.kind === 'pterodactyl'
                ? 'bottom-[86px] h-[40px] w-[46px]'
                : compact
                  ? 'bottom-12 h-[50px] w-[25px]'
                  : 'bottom-12 h-[60px] w-[30px]'
            }`}
          >
            {obstacle.kind === 'pterodactyl'
              ? <PterodactylSprite wingFrame={runningFrame} />
              : <CactusSprite />}
          </span>
        ))}

        {!running && (
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-sm tracking-[0.45em] sm:text-base">GAME OVER</span>
            <span className="flex h-8 w-9 items-center justify-center rounded-sm bg-[#535353] text-[#f7f7f7] dark:bg-slate-300 dark:text-slate-950">
              <RotateCcw className="h-5 w-5" strokeWidth={3} />
            </span>
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="font-mono text-[9px] tracking-wide text-slate-500 dark:text-slate-500">
          PULE: ESPAÇO, SETA PARA CIMA OU TOQUE
        </p>
        <button
          type="button"
          aria-label="Agachar dinossauro"
          onPointerDown={() => setDucking(true)}
          onPointerUp={() => setDucking(false)}
          onPointerLeave={() => setDucking(false)}
          className="flex shrink-0 items-center gap-1 border border-slate-300 px-2 py-1 font-mono text-[9px] tracking-wide text-slate-600 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <ArrowDown className="h-3 w-3" /> AGACHAR
        </button>
      </div>
    </div>
  );
}
