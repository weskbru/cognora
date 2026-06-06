import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  HelpCircle,
  Play,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRewardsContext } from '@/context/RewardsContext';
import { getLevelInfo } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';

const statusMap = {
  pending: { label: 'Pendente', class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processando', class: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', class: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Erro', class: 'bg-red-100 text-red-700' },
};

function estimateMinutes(questionCount) {
  if (questionCount === 0) return 0;
  return Math.max(5, Math.ceil(questionCount * 1.2));
}

function formatAccuracy(value) {
  if (value === null) return 'Sem tentativas';
  return `${value}% acerto`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatReviewDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function sortSubjectsByStudyPriority(a, b) {
  if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;

  const aAccuracy = a.accuracy === null ? Number.POSITIVE_INFINITY : a.accuracy;
  const bAccuracy = b.accuracy === null ? Number.POSITIVE_INFINITY : b.accuracy;
  if (aAccuracy !== bAccuracy) return aAccuracy - bAccuracy;

  if (a.lastStudySort !== b.lastStudySort) return a.lastStudySort - b.lastStudySort;

  return a.name.localeCompare(b.name, 'pt-BR');
}

export default function Dashboard() {
  const { user } = useAuth();
  const { progress } = useRewardsContext();
  const navigate = useNavigate();
  const [startingStudy, setStartingStudy] = useState(false);
  const [studyStartError, setStudyStartError] = useState('');

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('-created_date'),
  });

  const { data: summaries = [], isLoading: loadingSummaries } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => base44.entities.Summary.list('-created_date'),
  });

  const { data: attempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['question_attempts', user?.email],
    queryFn: () => base44.entities.QuestionAttempt.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: subjectProgress = [], isLoading: loadingSubjectProgress } = useQuery({
    queryKey: ['subject_progress', user?.email],
    queryFn: () => base44.entities.SubjectProgress.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const isLoading = loadingSubjects || loadingDocs || loadingQuestions || loadingSummaries || loadingAttempts || loadingSubjectProgress;
  const recentDocs = documents.slice(0, 5);
  const answeredQuestionIds = new Set(attempts.map(attempt => String(attempt.question_id)));
  const unansweredQuestions = questions.filter(question => !answeredQuestionIds.has(String(question.id)));
  const recommendedQuestions = unansweredQuestions.length > 0 ? unansweredQuestions : questions;
  const recommendedCount = Math.min(recommendedQuestions.length, 10);
  const estimatedMinutes = estimateMinutes(recommendedCount);
  const totalCorrect = attempts.filter(attempt => attempt.is_correct).length;
  const accuracy = attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : null;
  const streak = progress?.streak_days || 0;
  const xp = progress?.xp || 0;
  const level = getLevelInfo(xp);
  const today = startOfToday();
  const progressBySubject = new Map(subjectProgress.map(item => [String(item.subject_id), item]));
  const reviewsDueCount = subjectProgress.filter(item => {
    if (!item.next_review_at) return false;
    return startOfDate(item.next_review_at) <= today;
  }).length;

  const subjectStats = subjects.map(subject => {
    const subjectDocs = documents.filter(doc => doc.subject_id === subject.id);
    const subjectQuestions = questions.filter(question => question.subject_id === subject.id);
    const subjectQuestionIds = new Set(subjectQuestions.map(question => String(question.id)));
    const subjectAttempts = attempts.filter(attempt => subjectQuestionIds.has(String(attempt.question_id)));
    const subjectCorrect = subjectAttempts.filter(attempt => attempt.is_correct).length;
    const subjectAccuracy = subjectAttempts.length > 0
      ? Math.round((subjectCorrect / subjectAttempts.length) * 100)
      : null;
    const progressItem = progressBySubject.get(String(subject.id));
    const nextReview = progressItem?.next_review_at ? startOfDate(progressItem.next_review_at) : null;

    let status = 'Em estudo';
    let statusClass = 'bg-blue-100 text-blue-700 border-blue-200';
    let sortGroup = 4;
    let actionLabel = 'Estudar materia';
    let actionPath = `/quiz?subject=${subject.id}`;
    if (subjectDocs.length === 0) {
      status = 'Comece enviando conteudo';
      statusClass = 'bg-slate-100 text-slate-700 border-slate-200';
      sortGroup = 3;
      actionLabel = 'Enviar conteudo';
      actionPath = `/subjects/${subject.id}`;
    } else if (subjectQuestions.length === 0) {
      status = 'Sem questoes';
      statusClass = 'bg-amber-100 text-amber-700 border-amber-200';
      sortGroup = 3;
      actionLabel = 'Gerar questoes';
      actionPath = `/subjects/${subject.id}`;
    } else if (nextReview && nextReview < today) {
      status = 'Revisao atrasada';
      statusClass = 'bg-red-100 text-red-700 border-red-200';
      sortGroup = 1;
      actionLabel = 'Revisar agora';
    } else if (nextReview && nextReview.getTime() === today.getTime()) {
      status = 'Revisao hoje';
      statusClass = 'bg-amber-100 text-amber-700 border-amber-200';
      sortGroup = 2;
      actionLabel = 'Revisar agora';
    } else if (progressItem) {
      status = 'Em dia';
      statusClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }

    return {
      ...subject,
      docCount: subjectDocs.length,
      questionCount: subjectQuestions.length,
      answeredCount: subjectAttempts.length,
      accuracy: subjectAccuracy,
      lastStudiedAt: progressItem?.last_studied_at || null,
      nextReviewAt: progressItem?.next_review_at || null,
      reviewStage: progressItem?.review_stage || null,
      lastStudySort: progressItem?.last_studied_at ? new Date(progressItem.last_studied_at).getTime() : 0,
      sortGroup,
      actionLabel,
      actionPath,
      status,
      statusClass,
    };
  }).sort(sortSubjectsByStudyPriority);

  const handleStartStudy = async () => {
    if (startingStudy) return;
    setStudyStartError('');

    if (recommendedQuestions.length === 0) {
      setStudyStartError('Gere questões a partir de um documento antes de iniciar uma sessão de estudo.');
      window.setTimeout(() => navigate('/documents'), 1200);
      return;
    }

    setStartingStudy(true);
    try {
      let activeSessions = [];
      try {
        activeSessions = await base44.entities.StudySession.filter({ status: 'IN_PROGRESS' });
      } catch (error) {
        if (error?.status === 404) {
          setStudyStartError('Sessões de estudo ainda não estão disponíveis no backend. Abrindo o quiz normal.');
          window.setTimeout(() => navigate('/quiz'), 700);
          return;
        }
        throw error;
      }

      if (activeSessions.length > 0) {
        navigate(`/quiz?session=${activeSessions[0].id}`);
        return;
      }

      const plannedSubjectIds = Array.from(
        new Set(recommendedQuestions.map(question => question.subject_id).filter(Boolean))
      ).slice(0, 2);
      const questionsFromPlannedSubjects = plannedSubjectIds.length > 0
        ? recommendedQuestions.filter(question => plannedSubjectIds.includes(question.subject_id))
        : recommendedQuestions;
      const plannedQuestions = questionsFromPlannedSubjects.slice(0, 10);
      const plannedSubjects = plannedSubjectIds
        .map(subjectId => subjects.find(subject => subject.id === subjectId))
        .filter(Boolean)
        .map(subject => ({ id: subject.id, name: subject.name }));

      let session;
      try {
        session = await base44.entities.StudySession.create({
          status: 'IN_PROGRESS',
          subjects: plannedSubjects,
          questions_planned: plannedQuestions.map(question => question.id),
          questions_answered: [],
          reviews_planned: [],
          reviews_completed: [],
          xp_awarded: 0,
        });
      } catch (error) {
        if (error?.status === 404) {
          setStudyStartError('Sessões de estudo ainda não estão disponíveis no backend. Abrindo o quiz normal.');
          window.setTimeout(() => navigate('/quiz'), 700);
          return;
        }
        throw error;
      }

      navigate(`/quiz?session=${session.id}`);
    } catch (error) {
      console.error('Erro ao iniciar sessão de estudo:', error);
      setStudyStartError('Não foi possível iniciar sua sessão agora. Tente novamente.');
    } finally {
      setStartingStudy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-sm ring-1 ring-primary/10 md:p-8">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Hoje no Cognora</Badge>
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Seu estudo de hoje ja esta pronto.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Entre direto no proximo passo: responda questoes recomendadas e mantenha sua rotina andando.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-14 shrink-0 gap-3 rounded-lg px-8 text-base font-bold shadow-lg shadow-primary/25 md:text-lg"
              onClick={handleStartStudy}
              disabled={startingStudy}
            >
              <Play className="h-5 w-5" />
              {startingStudy ? 'Preparando...' : 'Comecar Estudo'}
            </Button>
          </div>
          {studyStartError && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {studyStartError}
            </p>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4 text-primary" />
                Questoes recomendadas
              </div>
              <p className="text-2xl font-bold">{recommendedCount}</p>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-amber-600" />
                Revisoes hoje
              </div>
              <p className="text-2xl font-bold">{reviewsDueCount}</p>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Tempo estimado
              </div>
              <p className="text-2xl font-bold">{estimatedMinutes || 0} min</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progresso atual</p>
              <p className="mt-2 text-3xl font-black text-foreground">{xp.toLocaleString('pt-BR')} XP</p>
              <p className="mt-1 text-sm text-muted-foreground">Nivel {level.level} - {level.name}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-secondary/70 p-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Taxa geral
                </span>
                <strong>{accuracy === null ? 'Sem respostas' : `${accuracy}%`}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/70 p-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  Respondidas
                </span>
                <strong>{attempts.length}</strong>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="XP total" value={xp.toLocaleString('pt-BR')} color="bg-primary/10 text-primary" />
        <StatCard icon={HelpCircle} label="Questões respondidas" value={attempts.length} color="bg-accent/10 text-accent" />
        <StatCard icon={BarChart3} label="Taxa geral" value={accuracy === null ? '-' : `${accuracy}%`} color="bg-amber-100 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Sequência atual" value={`${streak} dia${streak !== 1 ? 's' : ''}`} color="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Suas Materias</h2>
                <p className="text-sm text-muted-foreground">Estado inicial do seu plano de estudo.</p>
              </div>
              <Link to="/subjects" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {subjects.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nenhuma materia ainda"
                description="Crie sua primeira materia para o Cognora montar seu plano de estudo"
                actionLabel="Criar materia"
                actionPath="/subjects/new"
              />
            ) : (
              <div className="space-y-3">
                {subjectStats.slice(0, 6).map(subject => (
                  <div key={subject.id} className="rounded-lg border p-4 transition-colors hover:bg-secondary/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{subject.name}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{formatAccuracy(subject.accuracy)}</span>
                          <span>{subject.answeredCount} questao{subject.answeredCount !== 1 ? 'es' : ''} respondida{subject.answeredCount !== 1 ? 's' : ''}</span>
                          {subject.lastStudiedAt && (
                            <span>Ultimo estudo: {formatReviewDate(subject.lastStudiedAt)}</span>
                          )}
                          {subject.nextReviewAt && (
                            <span>Proxima revisao: {formatReviewDate(subject.nextReviewAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge variant="outline" className={subject.statusClass}>{subject.status}</Badge>
                        <Link to={subject.actionPath}>
                          <Button size="sm" variant={subject.sortGroup <= 2 ? 'default' : 'outline'} className="gap-1">
                            {subject.actionLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Documentos Recentes</h2>
              <Link to="/documents" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentDocs.map(doc => {
                  const subject = subjects.find(s => s.id === doc.subject_id);
                  const st = statusMap[doc.status] || statusMap.pending;
                  return (
                    <Link key={doc.id} to={`/documents/${doc.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{subject?.name || 'Sem materia'}</p>
                      </div>
                      <Badge variant="secondary" className={`${st.class} shrink-0 text-[10px]`}>{st.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
