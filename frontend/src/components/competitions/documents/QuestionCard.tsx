import { useState, type ReactElement } from 'react';
import { useRewardsContext } from '@/context/RewardsContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Star } from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false' | 'essay';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Alternative {
  text: string;
  correct: boolean;
}

interface Question {
  id: string;
  type: QuestionType;
  difficulty?: Difficulty;
  statement: string;
  alternatives?: Alternative[];
  explanation?: string;
}

interface QuestionCardProps {
  question: Question;
  index: number;
  onAnswer?: (isCorrect: boolean) => void;
  awardXp?: boolean;
}

interface RewardsContextValue {
  addXPForCorrectAnswer: () => void;
  addXPForWrongAnswer: () => void;
}

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
};

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: 'Fácil', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  medium: { label: 'Médio', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  hard: { label: 'Difícil', className: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
};

const IDLE_STATE = 'border-border hover:border-primary/50 cursor-pointer dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:border-primary/70';
const CORRECT_STATE = 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/55 dark:text-emerald-100 dark:shadow-[0_0_24px_rgba(16,185,129,0.2)]';
const WRONG_STATE = 'border-red-500 bg-red-50 text-red-950 dark:border-red-400/80 dark:bg-red-950/50 dark:text-red-100';
const DIMMED_STATE = 'border-border opacity-60 dark:border-slate-800 dark:bg-slate-950/25 dark:text-slate-400';

export default function QuestionCard({ question, index, onAnswer, awardXp = true }: QuestionCardProps): ReactElement {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const diff = question.difficulty ? difficultyConfig[question.difficulty] : difficultyConfig.medium;
  const { addXPForCorrectAnswer, addXPForWrongAnswer } = useRewardsContext() as RewardsContextValue;
  const { user } = useAuth();
  const selectedAlternative = selectedAnswer === null ? undefined : question.alternatives?.[selectedAnswer];
  const answeredCorrectly = selectedAlternative?.correct === true;

  const handleSelect = (altIndex: number): void => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(altIndex);
    const isCorrect = question.alternatives?.[altIndex]?.correct;
    if (awardXp) {
      if (isCorrect) addXPForCorrectAnswer();
      else addXPForWrongAnswer();
    }
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
    <Card className="p-5 dark:border-slate-800 dark:bg-slate-950/45 dark:shadow-none">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
          <Badge variant="outline" className="text-xs">{typeLabels[question.type]}</Badge>
          <Badge variant="secondary" className={diff.className}>{diff.label}</Badge>
        </div>
        {selectedAnswer !== null && (
          <Badge
            variant="outline"
            className={answeredCorrectly
              ? 'gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'gap-1 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'}
          >
            {answeredCorrectly ? <Star className="h-3.5 w-3.5 fill-current" /> : <XCircle className="h-3.5 w-3.5" />}
            {answeredCorrectly ? 'Correto!' : 'Revise'}
          </Badge>
        )}
      </div>

      <p className="font-medium text-foreground mb-5 text-base leading-relaxed dark:text-slate-100">{question.statement}</p>

      {question.type === 'multiple_choice' && question.alternatives && (
        <div className="space-y-2 mb-4">
          {question.alternatives.map((alt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = alt.correct;
            const showResult = selectedAnswer !== null;

            let borderClass = IDLE_STATE;
            if (showResult && isCorrect) borderClass = CORRECT_STATE;
            else if (showResult && isSelected && !isCorrect) borderClass = WRONG_STATE;
            else if (showResult) borderClass = DIMMED_STATE;

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

            let cls = IDLE_STATE;
            if (showResult && isCorrect) cls = CORRECT_STATE;
            else if (showResult && isSelected && !isCorrect) cls = WRONG_STATE;
            else if (showResult) cls = DIMMED_STATE;

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-center transition-all ${cls}`}
              >
                <span className="text-sm font-medium">{alt.text}</span>
                {showResult && isCorrect && <CheckCircle2 className="absolute right-3 h-5 w-5 text-emerald-400" />}
                {showResult && isSelected && !isCorrect && <XCircle className="absolute right-3 h-5 w-5 text-red-400" />}
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
