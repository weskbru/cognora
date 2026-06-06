import { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
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
import { useRewardsContext } from '@/context/RewardsContext';

export default function Quiz() {
  const queryClient = useQueryClient();
  const { refreshProgress } = useRewardsContext();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const initialSubjectFilter = searchParams.get('subject') || 'all';
  const [subjectFilter, setSubjectFilter]     = useState(initialSubjectFilter);
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

  const { data: studySession = null, isLoading: loadingSession } = useQuery({
    queryKey: ['study_session', sessionId],
    queryFn: () => base44.entities.StudySession.get(sessionId),
    enabled: !!sessionId,
  });

  const sessionQuestionIds = useMemo(
    () => new Set((studySession?.questions_planned || []).map(id => String(id))),
    [studySession]
  );

  const sessionQuestions = useMemo(() => {
    if (!sessionId) return questions;
    return questions.filter(question => sessionQuestionIds.has(String(question.id)));
  }, [questions, sessionId, sessionQuestionIds]);

  const persistedAnsweredIds = useMemo(
    () => new Set((studySession?.questions_answered || []).map(id => String(id))),
    [studySession]
  );

  const filtered = useMemo(() => {
    return sessionQuestions.filter(q => {
      if (subjectFilter !== 'all' && q.subject_id !== subjectFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      return true;
    });
  }, [sessionQuestions, subjectFilter, difficultyFilter, typeFilter]);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
  }, [subjectFilter, difficultyFilter, typeFilter]);

  const total = filtered.length;
  const localAnsweredIds = Object.keys(answers);
  const answeredCount = sessionId
    ? new Set([...persistedAnsweredIds, ...localAnsweredIds.map(String)]).size
    : localAnsweredIds.length;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const correctCount = Object.values(answers).filter(Boolean).length;
  const wrongCount = answeredCount - correctCount;
  const isLastQuestion = currentIndex === total - 1;
  const currentQuestionId = filtered[currentIndex]?.id;
  const currentAnswered = currentQuestionId && (
    answers[currentQuestionId] !== undefined || persistedAnsweredIds.has(String(currentQuestionId))
  );
  const sessionCompleted = sessionId && studySession?.status === 'COMPLETED';
  const sessionCompletionTarget = sessionId ? Math.min(10, sessionQuestions.length) : total;

  const goTo = (i) => {
    if (i >= 0 && i < total) setCurrentIndex(i);
  };

  const handleAnswer = async (questionId, isCorrect) => {
    if (sessionCompleted) return;
    setAnswers(prev => ({ ...prev, [questionId]: isCorrect }));

    if (sessionId && studySession) {
      const existingIds = (studySession.questions_answered || []).map(id => String(id));
      if (existingIds.includes(String(questionId))) return;

      const nextAnsweredIds = [...existingIds, String(questionId)];
      const shouldComplete = nextAnsweredIds.length >= sessionCompletionTarget;
      try {
        const updatedSession = await base44.entities.StudySession.update(sessionId, {
          questions_answered: nextAnsweredIds,
          ...(shouldComplete ? { status: 'COMPLETED' } : {}),
        });
        queryClient.setQueryData(['study_session', sessionId], updatedSession);
        if (updatedSession.status === 'COMPLETED') {
          refreshProgress?.();
          setShowResults(true);
        }
      } catch (error) {
        console.error('Erro ao atualizar sessão de estudo:', error);
      }
    }
  };

  const handleRestart = () => {
    if (sessionId) return;
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
  };

  if (isLoading || loadingSession) {
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
      <PageHeader
        title={sessionId ? 'Sessão de Estudo' : 'Questões'}
        description={sessionId ? 'Responda as questões planejadas para hoje' : 'Pratique com questões geradas por IA'}
      />

      {/* Filtros */}
      {questions.length > 0 && !sessionId && (
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
      ) : sessionId && sessionQuestions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Sessão sem questões disponíveis"
          description="Esta sessão não encontrou as questões planejadas. Volte ao dashboard e tente iniciar novamente."
          actionLabel="Voltar ao Dashboard"
          actionPath="/dashboard"
        />
      ) : sessionCompleted ? (
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <Trophy className="h-10 w-10 text-emerald-600" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Sessão concluída</h2>
            <p className="text-muted-foreground">
              Seu progresso desta sessão foi registrado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-2xl font-bold text-foreground">{sessionQuestions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Planejadas</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-700">{persistedAnsweredIds.size}</p>
              <p className="text-xs text-emerald-600">Respondidas</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-4">
              <p className="text-2xl font-bold text-primary">
                {Math.round((persistedAnsweredIds.size / Math.max(1, sessionQuestions.length)) * 100)}%
              </p>
              <p className="text-xs text-primary">Conclusão</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-2xl font-bold text-amber-700">+{studySession.xp_awarded || 0}</p>
              <p className="text-xs text-amber-600">XP ganho</p>
            </div>
          </div>

          {studySession.completed_at && (
            <p className="text-sm text-muted-foreground">
              Concluída em {new Date(studySession.completed_at).toLocaleString('pt-BR')}
            </p>
          )}

          <div className="flex justify-center">
            <Link to="/dashboard">
              <Button className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </Card>
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
                {!sessionId && (
                  <button
                    onClick={handleRestart}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Reiniciar
                  </button>
                )}
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
            {filtered.map((q, i) => {
              const qAnswered = persistedAnsweredIds.has(String(q.id)) || answers[q.id] !== undefined;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  title={`Questão ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                    i === currentIndex
                      ? 'bg-primary scale-125'
                      : sessionId && qAnswered
                      ? 'bg-emerald-400'
                      : answers[q.id] === true
                      ? 'bg-emerald-400'
                      : answers[q.id] === false
                      ? 'bg-red-400'
                      : 'bg-secondary hover:bg-primary/40'
                  }`}
                />
              );
            })}
          </div>

          {/* Questão atual */}
          <QuestionCard
            key={filtered[currentIndex]?.id}
            question={filtered[currentIndex]}
            index={currentIndex}
            awardXp={!sessionId}
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

            {isLastQuestion && currentAnswered && !sessionId && (
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
