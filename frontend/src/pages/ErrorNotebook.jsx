import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  BookX, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, RotateCcw, Star, Trophy,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/competitions/shared/PageHeader';
import EmptyState from '@/components/competitions/shared/EmptyState';

const difficultyConfig = {
  easy:   { label: 'Fácil',   class: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Médio',   class: 'bg-amber-100 text-amber-700' },
  hard:   { label: 'Difícil', class: 'bg-red-100 text-red-700' },
};

const typeLabels = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
};

// Card de uma questão — interativo, sem avançar sozinho
function ReviewCard({ question, index, total, onAnswered }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const { user } = useAuth();

  const diff = difficultyConfig[question.difficulty] || difficultyConfig.medium;
  const answered = selectedAnswer !== null;
  const answeredCorrectly = answered && question.alternatives?.[selectedAnswer]?.correct;

  const handleSelect = (i) => {
    if (answered) return;
    setSelectedAnswer(i);
    const isCorrect = !!question.alternatives?.[i]?.correct;

    if (user?.email) {
      base44.entities.QuestionAttempt.create({
        question_id: question.id,
        user_email: user.email,
        is_correct: isCorrect,
      }).catch(() => {});
    }

    if (question.explanation) setShowExplanation(true);
    if (onAnswered) onAnswered(isCorrect);
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  return (
    <Card className={`p-5 transition-all duration-300 ${
      answered && answeredCorrectly
        ? 'border-emerald-400 bg-emerald-50/30'
        : answered
        ? 'border-red-300'
        : 'border-red-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {answered ? (
            answeredCorrectly
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <Badge variant="outline" className="text-xs">{typeLabels[question.type]}</Badge>
          <Badge variant="secondary" className={diff.class}>{diff.label}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {answered && answeredCorrectly && (
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
              Dominado!
            </div>
          )}
          {answered && !answeredCorrectly && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Tentar novamente
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {index + 1} / {total}
          </span>
        </div>
      </div>

      {/* Enunciado */}
      <p className="font-medium text-foreground mb-4 leading-relaxed">{question.statement}</p>

      {/* Alternativas — múltipla escolha */}
      {question.type === 'multiple_choice' && question.alternatives && (
        <div className="space-y-2 mb-4">
          {question.alternatives.map((alt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = alt.correct;

            let borderClass = 'border-border hover:border-primary/50 cursor-pointer';
            if (answered && isCorrect) borderClass = 'border-emerald-500 bg-emerald-50';
            else if (answered && isSelected && !isCorrect) borderClass = 'border-red-500 bg-red-50';
            else if (answered) borderClass = 'border-border opacity-50';

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  !answered ? 'cursor-pointer' : 'cursor-default'
                } ${borderClass}`}
              >
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
                  answered && isCorrect
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : answered && isSelected
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-border text-muted-foreground'
                }`}>
                  {answered && isCorrect
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : answered && isSelected
                    ? <XCircle className="h-3.5 w-3.5" />
                    : String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm">{alt.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Alternativas — verdadeiro/falso */}
      {question.type === 'true_false' && question.alternatives && (
        <div className="flex gap-3 mb-4">
          {question.alternatives.map((alt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = alt.correct;

            let cls = 'border-border hover:border-primary/50';
            if (answered && isCorrect) cls = 'border-emerald-500 bg-emerald-50';
            else if (answered && isSelected && !isCorrect) cls = 'border-red-500 bg-red-50';
            else if (answered) cls = 'border-border opacity-50';

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex-1 text-center p-3 rounded-lg border transition-all ${
                  !answered ? 'cursor-pointer' : 'cursor-default'
                } ${cls}`}
              >
                <span className="text-sm font-medium">{alt.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Explicação */}
      {question.explanation && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowExplanation(v => !v)}
          >
            {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showExplanation ? 'Ocultar explicação' : 'Ver explicação'}
          </button>
          {showExplanation && (
            <div className="mt-2 p-3 bg-secondary rounded-lg">
              <p className="text-sm text-foreground/80 leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ErrorNotebook() {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredMap, setAnsweredMap] = useState({});   // { [questionId]: boolean }
  const [showResults, setShowResults] = useState(false);

  const { data: attempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['question_attempts', user?.email],
    queryFn: () => base44.entities.QuestionAttempt.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('-created_date'),
  });

  const wrongQuestions = useMemo(() => {
    const wrongIds = new Set(
      attempts.filter(a => a.is_correct === false).map(a => a.question_id)
    );
    return allQuestions.filter(q => wrongIds.has(q.id));
  }, [attempts, allQuestions]);

  const total = wrongQuestions.length;
  const answeredCount = Object.keys(answeredMap).length;
  const correctCount = Object.values(answeredMap).filter(Boolean).length;
  const wrongCount = answeredCount - correctCount;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const currentQuestion = wrongQuestions[currentIndex];
  const currentAnswered = currentQuestion && answeredMap[currentQuestion.id] !== undefined;
  const isLast = currentIndex === total - 1;

  const handleAnswered = (isCorrect) => {
    setAnsweredMap(prev => ({ ...prev, [currentQuestion.id]: isCorrect }));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnsweredMap({});
    setShowResults(false);
  };

  if (loadingAttempts || loadingQuestions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Caderno de Erros"
        description={total > 0
          ? `${total} questão(ões) para revisar — responda para fixar o aprendizado`
          : 'Questões respondidas incorretamente'}
      />

      {total === 0 ? (
        <EmptyState
          icon={BookX}
          title="Nenhum erro registrado"
          description="Responda questões no Quiz para que seus erros apareçam aqui para revisão"
          actionLabel="Ir para Questões"
          actionPath="/quiz"
        />
      ) : showResults ? (
        /* Tela de resultado da revisão */
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
              correctCount / total >= 0.7 ? 'bg-emerald-100' : correctCount / total >= 0.4 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <Trophy className={`h-10 w-10 ${
                correctCount / total >= 0.7 ? 'text-emerald-600' : correctCount / total >= 0.4 ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Revisão Concluída!</h2>
            <p className="text-muted-foreground">
              {correctCount / total >= 0.8
                ? 'Excelente! Você está dominando o conteúdo.'
                : correctCount / total >= 0.6
                ? 'Bom progresso! Continue revisando os erros.'
                : correctCount / total >= 0.4
                ? 'Continue praticando — a repetição é chave.'
                : 'Não desanime! Revise as explicações e tente novamente.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-xl">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-700">{correctCount}</p>
              </div>
              <p className="text-xs text-emerald-600">Acertos</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
              </div>
              <p className="text-xs text-red-500">Erros</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-4xl font-bold text-primary">{Math.round((correctCount / total) * 100)}%</p>
            <p className="text-sm text-muted-foreground">de aproveitamento</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Revisar novamente
            </button>
            <Link to="/quiz">
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors w-full">
                Ir para o Quiz
              </button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Questão <span className="text-primary font-bold">{currentIndex + 1}</span> de <span className="font-bold">{total}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {answeredCount}/{total} respondidas
                </span>
                <button
                  onClick={handleRestart}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reiniciar
                </button>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Bolinhas de navegação */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {wrongQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  // Só permite ir para questões já respondidas ou a atual
                  if (i <= currentIndex || answeredMap[wrongQuestions[i - 1]?.id] !== undefined) {
                    setCurrentIndex(i);
                  }
                }}
                title={`Questão ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'bg-primary scale-125'
                    : answeredMap[q.id] === true
                    ? 'bg-emerald-400'
                    : answeredMap[q.id] === false
                    ? 'bg-red-400'
                    : 'bg-secondary'
                }`}
              />
            ))}
          </div>

          {/* Card da questão atual */}
          {currentQuestion && (
            <ReviewCard
              key={currentQuestion.id}
              question={currentQuestion}
              index={currentIndex}
              total={total}
              onAnswered={handleAnswered}
            />
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>

            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {total}
            </span>

            {isLast && currentAnswered ? (
              <button
                onClick={() => setShowResults(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <Trophy className="h-4 w-4" /> Finalizar Revisão
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                disabled={!currentAnswered || isLast}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
