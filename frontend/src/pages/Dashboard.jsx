import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Sparkles,
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
  if (value === null) return 'Sem respostas';
  return `${value}% acerto`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { progress } = useRewardsContext();

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

  const isLoading = loadingSubjects || loadingDocs || loadingQuestions || loadingSummaries || loadingAttempts;
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

  const subjectStats = subjects.map(subject => {
    const subjectDocs = documents.filter(doc => doc.subject_id === subject.id);
    const subjectQuestions = questions.filter(question => question.subject_id === subject.id);
    const subjectQuestionIds = new Set(subjectQuestions.map(question => String(question.id)));
    const subjectAttempts = attempts.filter(attempt => subjectQuestionIds.has(String(attempt.question_id)));
    const subjectCorrect = subjectAttempts.filter(attempt => attempt.is_correct).length;
    const subjectAccuracy = subjectAttempts.length > 0
      ? Math.round((subjectCorrect / subjectAttempts.length) * 100)
      : null;

    let status = 'Em estudo';
    let statusClass = 'bg-blue-100 text-blue-700 border-blue-200';
    if (subjectDocs.length === 0) {
      status = 'Comece enviando conteudo';
      statusClass = 'bg-slate-100 text-slate-700 border-slate-200';
    } else if (subjectQuestions.length === 0) {
      status = 'Sem questoes';
      statusClass = 'bg-amber-100 text-amber-700 border-amber-200';
    } else if (subjectAttempts.length > 0) {
      status = 'Em dia';
      statusClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }

    return {
      ...subject,
      docCount: subjectDocs.length,
      questionCount: subjectQuestions.length,
      answeredCount: subjectAttempts.length,
      accuracy: subjectAccuracy,
      status,
      statusClass,
    };
  });

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
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Hoje no Cognora</Badge>
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Seu estudo de hoje ja esta pronto.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Entre direto no proximo passo: responda questoes recomendadas e mantenha sua rotina andando.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0 gap-2 px-6 text-base">
              <Link to={recommendedCount > 0 ? '/quiz' : '/documents'}>
                <Play className="h-5 w-5" />
                Comecar Estudo
              </Link>
            </Button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4 text-primary" />
                Questoes recomendadas
              </div>
              <p className="text-2xl font-bold">{recommendedCount}</p>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Revisoes pendentes
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="mt-1 text-xs text-muted-foreground">Entram na proxima sprint</p>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                Sequencia
              </div>
              <p className="text-2xl font-bold">{streak} dia{streak !== 1 ? 's' : ''}</p>
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
        <StatCard icon={BookOpen} label="Matérias" value={subjects.length} color="bg-primary/10 text-primary" />
        <StatCard icon={FileText} label="Documentos" value={documents.length} color="bg-accent/10 text-accent" />
        <StatCard icon={Sparkles} label="Resumos" value={summaries.length} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={BarChart3} label="Taxa geral" value={accuracy === null ? '-' : `${accuracy}%`} color="bg-amber-100 text-amber-600" />
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
                  <Link key={subject.id} to={`/subjects/${subject.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-secondary/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{subject.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {subject.docCount} PDF{subject.docCount !== 1 ? 's' : ''} - {subject.answeredCount} questao{subject.answeredCount !== 1 ? 'es' : ''} respondida{subject.answeredCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatAccuracy(subject.accuracy)}</Badge>
                        <Badge variant="outline" className={subject.statusClass}>{subject.status}</Badge>
                      </div>
                    </div>
                  </Link>
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
