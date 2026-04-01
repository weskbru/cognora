import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import RadialProgress from './RadialProgress';

const STEPS = [
  { pct: 10, msg: 'Lendo o documento…' },
  { pct: 30, msg: 'Identificando tópicos principais…' },
  { pct: 55, msg: 'Processando com IA…' },
  { pct: 75, msg: 'Estruturando o conteúdo…' },
  { pct: 90, msg: 'Quase pronto…' },
];

/**
 * AILoadingCard — animated radial progress shown during AI generation.
 *
 * Props:
 *   title    — heading text (e.g. "Gerando resumo com IA...")
 *   subtitle — secondary line (optional)
 */
export default function AILoadingCard({ title, subtitle }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const intervals = STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 2200)
    );
    return () => intervals.forEach(clearTimeout);
  }, []);

  const current = STEPS[step];

  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center gap-5">
      <RadialProgress value={current.pct} size={88} thickness={7} />
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{current.msg}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
