import { type ReactElement, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import DinoLoadingGame from './DinoLoadingGame';

const STEPS = [
  'Lendo o documento...',
  'Identificando topicos principais...',
  'Processando com IA...',
  'Estruturando o conteudo...',
  'Quase pronto...',
];

interface AILoadingCardProps {
  title: string;
  subtitle?: string;
}

export default function AILoadingCard({ title, subtitle }: AILoadingCardProps): ReactElement {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const intervals = STEPS.map((_, index) =>
      setTimeout(() => setStep(index), index * 2200)
    );
    return () => intervals.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(current => {
        if (current >= 95) return current;
        const increment = current < 55 ? 4 : current < 80 ? 2 : 1;
        return Math.min(95, current + increment);
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="flex flex-col items-center justify-center gap-5 p-6 text-center md:p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex items-end justify-between gap-4 text-left">
          <div>
            <p className="text-sm text-foreground">Seu jogo vai iniciar enquanto preparamos o conteúdo.</p>
            <p className="mt-1 text-xs text-muted-foreground">Pule os obstáculos até a geração terminar.</p>
          </div>
          <span className="text-lg tabular-nums text-primary">{progress}%</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <DinoLoadingGame progress={progress} />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{STEPS[step]}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground/60">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
