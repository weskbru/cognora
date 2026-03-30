import React, { useState } from 'react';
import { useRewardsContext } from '@/context/RewardsContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const typeLabels = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
};

const difficultyConfig = {
  easy: { label: 'Fácil', class: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Médio', class: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Difícil', class: 'bg-red-100 text-red-700' },
};

export default function QuestionCard({ question, index, onAnswer }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const diff = difficultyConfig[question.difficulty] || difficultyConfig.medium;
  const { addXPForCorrectAnswer, addXPForWrongAnswer } = useRewardsContext();
  const { user } = useAuth();

  const handleSelect = (altIndex) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(altIndex);
    const isCorrect = question.alternatives?.[altIndex]?.correct;
    if (isCorrect) addXPForCorrectAnswer();
    else addXPForWrongAnswer();
    if (user?.email) {
      base44.entities.QuestionAttempt.create({
        question_id: question.id,
        user_email: user.email,
        is_correct: !!isCorrect,
      }).catch(() => {});
    }
    if (onAnswer) onAnswer(!!isCorrect);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
          <Badge variant="outline" className="text-xs">{typeLabels[question.type]}</Badge>
          <Badge variant="secondary" className={diff.class}>{diff.label}</Badge>
        </div>
      </div>

      <p className="font-medium text-foreground mb-4 leading-relaxed">{question.statement}</p>

      {question.type === 'multiple_choice' && question.alternatives && (
        <div className="space-y-2 mb-4">
          {question.alternatives.map((alt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = alt.correct;
            const showResult = selectedAnswer !== null;
            
            let borderClass = 'border-border hover:border-primary/50 cursor-pointer';
            if (showResult && isCorrect) borderClass = 'border-emerald-500 bg-emerald-50';
            else if (showResult && isSelected && !isCorrect) borderClass = 'border-red-500 bg-red-50';
            else if (showResult) borderClass = 'border-border opacity-60';

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${borderClass}`}
              >
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
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

      {question.type === 'true_false' && question.alternatives && (
        <div className="flex gap-3 mb-4">
          {question.alternatives.map((alt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = alt.correct;
            const showResult = selectedAnswer !== null;

            let cls = 'border-border hover:border-primary/50 cursor-pointer';
            if (showResult && isCorrect) cls = 'border-emerald-500 bg-emerald-50';
            else if (showResult && isSelected && !isCorrect) cls = 'border-red-500 bg-red-50';
            else if (showResult) cls = 'border-border opacity-60';

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex-1 text-center p-3 rounded-lg border transition-all ${cls}`}
              >
                <span className="text-sm font-medium">{alt.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {question.explanation && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => setShowExplanation(!showExplanation)}
          >
            {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Explicação
          </Button>
          {showExplanation && (
            <div className="mt-2 p-3 bg-secondary rounded-lg">
              <p className="text-sm text-foreground/80">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
