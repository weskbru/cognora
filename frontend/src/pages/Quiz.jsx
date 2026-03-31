import { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HelpCircle, CheckCircle2, RotateCcw, XCircle, Trophy, BookX,
} from 'lucide-react';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationPrevious, PaginationNext,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/competitions/shared/PageHeader';
import EmptyState from '@/components/competitions/shared/EmptyState';
import QuestionCard from '@/components/competitions/documents/QuestionCard';

export default function Quiz() {
  const [subjectFilter, setSubjectFilter]     = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter]           = useState('all');
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [answers, setAnswers]                 = useState({});  // { [questionId]: boolean }
  const [showResults, setShowResults]         = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('-created_date'),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  const filtered = useMemo(() => {
    return questions.filter(q => {
      if (subjectFilter !== 'all' && q.subject_id !== subjectFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      return true;
    });
  }, [questions, subjectFilter, difficultyFilter, typeFilter]);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
  }, [subjectFilter, difficultyFilter, typeFilter]);

  const total = filtered.length;
  const answeredCount = Object.keys(answers).length;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const correctCount = Object.values(answers).filter(Boolean).length;
  const wrongCount = answeredCount - correctCount;
  const isLastQuestion = currentIndex === total - 1;
  const currentAnswered = filtered[currentIndex] && answers[filtered[currentIndex].id] !== undefined;

  const goTo = (i) => {
    if (i >= 0 && i < total) setCurrentIndex(i);
  };

  const handleAnswer = (questionId, isCorrect) => {
    setAnswers(prev => ({ ...prev, [questionId]: isCorrect }));
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Questões" description="Pratique com questões geradas por IA" />

      {/* Filtros */}
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Matéria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as matérias</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="hard">Difícil</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
              <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
              <SelectItem value="essay">Dissertativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Nenhuma questão gerada"
          description="Envie um documento e gere questões automaticamente a partir do conteúdo"
          actionLabel="Ver Documentos"
          actionPath="/documents"
        />
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          Nenhuma questão encontrada com os filtros selecionados
        </p>
      ) : showResults ? (
        /* Tela de resultados */
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
            <h2 className="text-2xl font-bold text-foreground mb-1">Quiz Finalizado!</h2>
            <p className="text-muted-foreground">
              {correctCount / total >= 0.8 ? 'Excelente desempenho! Continue assim!' :
               correctCount / total >= 0.6 ? 'Bom trabalho! Você está no caminho certo.' :
               correctCount / total >= 0.4 ? 'Continue praticando para melhorar.' :
               'Não desanime! Revise o conteúdo e tente novamente.'}
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
            <Button onClick={handleRestart} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reiniciar Quiz
            </Button>
            {wrongCount > 0 && (
              <Link to="/error-notebook">
                <Button variant="outline" className="gap-2 w-full">
                  <BookX className="h-4 w-4" /> Ver Caderno de Erros
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Cabeçalho de progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Questão{' '}
                <span className="text-primary font-bold">{currentIndex + 1}</span>
                {' '}de{' '}
                <span className="font-bold">{total}</span>
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

          {/* Bolinhas de navegação rápida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {filtered.map((q, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                title={`Questão ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'bg-primary scale-125'
                    : answers[q.id] === true
                    ? 'bg-emerald-400'
                    : answers[q.id] === false
                    ? 'bg-red-400'
                    : 'bg-secondary hover:bg-primary/40'
                }`}
              />
            ))}
          </div>

          {/* Questão atual */}
          <QuestionCard
            key={filtered[currentIndex]?.id}
            question={filtered[currentIndex]}
            index={currentIndex}
            onAnswer={(isCorrect) => handleAnswer(filtered[currentIndex].id, isCorrect)}
          />

          {/* Navegação */}
          <div className="space-y-3 pt-1">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={e => { e.preventDefault(); goTo(currentIndex - 1); }}
                    className={currentIndex === 0 ? 'pointer-events-none opacity-50' : ''}
                    aria-disabled={currentIndex === 0}
                  />
                </PaginationItem>

                <PaginationItem>
                  <span className="text-sm text-muted-foreground px-3 tabular-nums">
                    {currentIndex + 1} / {total}
                  </span>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={e => { e.preventDefault(); goTo(currentIndex + 1); }}
                    className={isLastQuestion ? 'pointer-events-none opacity-50' : ''}
                    aria-disabled={isLastQuestion}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            {isLastQuestion && currentAnswered && (
              <div className="flex justify-center">
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setShowResults(true)}
                >
                  <Trophy className="h-4 w-4" /> Finalizar Quiz
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
