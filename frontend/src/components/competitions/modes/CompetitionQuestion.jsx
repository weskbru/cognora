import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

const diffConfig = {
  easy: { label: 'Fácil', cls: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Médio', cls: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Difícil', cls: 'bg-red-100 text-red-700' },
};

export default function CompetitionQuestion({ question, index, total, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const diff = diffConfig[question.difficulty] || diffConfig.medium;

  const handleSelect = (i) => {
    if (selected !== null) return;
    setSelected(i);
    const isCorrect = question.alternatives?.[i]?.correct === true;
    setTimeout(() => onAnswer(isCorrect), 900);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-muted-foreground">Questão {index + 1} de {total}</span>
        <Badge className={diff.cls}>{diff.label}</Badge>
      </div>
      <p className="font-semibold text-base mb-5 leading-relaxed">{question.statement}</p>

      {(question.type === 'multiple_choice' || question.type === 'true_false') && question.alternatives && (
        <div className="space-y-2">
          {question.alternatives.map((alt, i) => {
            const isSelected = selected === i;
            const isCorrect = alt.correct;
            const showResult = selected !== null;
            let cls = 'border-border hover:border-primary/50 cursor-pointer';
            if (showResult && isCorrect) cls = 'border-emerald-500 bg-emerald-50';
            else if (showResult && isSelected && !isCorrect) cls = 'border-red-500 bg-red-50';
            else if (showResult) cls = 'border-border opacity-50';

            return (
              <div key={i} onClick={() => handleSelect(i)} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${cls}`}>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                  showResult && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                  showResult && isSelected ? 'border-red-500 bg-red-500 text-white' :
                  'border-border text-muted-foreground'
                }`}>
                  {showResult && isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   showResult && isSelected ? <XCircle className="h-3.5 w-3.5" /> :
                   String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm">{alt.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {question.type === 'essay' && (
        <div className="p-4 bg-secondary rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">Questão dissertativa</p>
          <p>{question.explanation || 'Reflita sobre o tema antes de continuar.'}</p>
          <button onClick={() => onAnswer(true)} className="mt-3 text-primary text-sm font-medium hover:underline">
            Marcar como respondida →
          </button>
        </div>
      )}
    </Card>
  );
}