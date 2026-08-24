import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  Loader2,
  Map,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import { getErrorMessage } from '@/lib/apiError';
import type { CreateStudyPathPayload, StudyPath } from '@/types/entities';

const STUDY_PATHS_QUERY_KEY = ['study-paths'] as const;
const TypedAlert = Alert as ComponentType<PropsWithChildren<{ variant?: 'default' | 'destructive' }>>;
const TypedAlertTitle = AlertTitle as ComponentType<PropsWithChildren>;
const TypedAlertDescription = AlertDescription as ComponentType<PropsWithChildren>;
const TypedProgress = Progress as ComponentType<{ value: number }>;
const TypedCheckbox = Checkbox as ComponentType<{
  checked: boolean;
  onCheckedChange: (value: boolean | 'indeterminate') => void;
  disabled?: boolean;
  'aria-label'?: string;
}>;

function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value?: string | null): string {
  if (!value) return 'Sem data definida';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function replacePath(paths: StudyPath[] | undefined, updated: StudyPath): StudyPath[] {
  if (!paths) return [updated];
  return paths.map(path => path.id === updated.id ? updated : path);
}

export default function StudyPaths(): ReactElement {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [objective, setObjective] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weeksCount, setWeeksCount] = useState(8);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pathsQuery = useQuery<StudyPath[]>({
    queryKey: STUDY_PATHS_QUERY_KEY,
    queryFn: () => base44.studyPaths.list(),
    refetchInterval: query => query.state.data?.some(path => ['queued', 'processing'].includes(path.status)) ? 2_000 : false,
  });

  const paths = pathsQuery.data ?? [];
  const selected = paths.find(path => path.id === selectedId) ?? paths[0] ?? null;
  const shouldShowForm = showForm || (!pathsQuery.isLoading && paths.length === 0);

  const createMutation = useMutation({
    mutationFn: (payload: CreateStudyPathPayload) => base44.studyPaths.create(payload),
    onSuccess: path => {
      queryClient.setQueryData<StudyPath[]>(STUDY_PATHS_QUERY_KEY, current => [
        path,
        ...(current ?? []).filter(item => item.id !== path.id),
      ]);
      setSelectedId(path.id);
      setShowForm(false);
      setObjective('');
      setTargetDate('');
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: string[] }) =>
      base44.studyPaths.updateProgress(id, completed),
    onSuccess: path => queryClient.setQueryData<StudyPath[]>(
      STUDY_PATHS_QUERY_KEY,
      current => replacePath(current, path),
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.studyPaths.delete(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<StudyPath[]>(
        STUDY_PATHS_QUERY_KEY,
        current => (current ?? []).filter(path => path.id !== id),
      );
      setSelectedId(null);
      setDeleteOpen(false);
    },
  });

  const progress = useMemo(() => {
    if (!selected) return { completed: 0, total: 0, percentage: 0 };
    const total = selected.weeks.reduce((sum, week) => sum + week.milestones.length, 0);
    const completed = selected.completed_milestones.length;
    return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
  }, [selected]);

  const handleCreate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (objective.trim().length < 10) return;
    createMutation.mutate({
      objective: objective.trim(),
      target_date: targetDate || null,
      weeks_count: weeksCount,
      hours_per_week: hoursPerWeek,
    });
  };

  const toggleMilestone = (milestoneId: string, checked: boolean): void => {
    if (!selected || progressMutation.isPending) return;
    const next = checked
      ? [...selected.completed_milestones, milestoneId]
      : selected.completed_milestones.filter(item => item !== milestoneId);
    progressMutation.mutate({ id: selected.id, completed: [...new Set(next)] });
  };

  return (
    <div>
      <PageHeader
        title="Trilha de Estudos"
        description="Transforme seu objetivo em um plano semanal claro e progressivo."
      >
        {paths.length > 0 && !shouldShowForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova trilha
          </Button>
        )}
      </PageHeader>

      {shouldShowForm ? (
        <div className="mx-auto max-w-3xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Monte sua trilha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="study-objective">Qual é o seu objetivo?</Label>
                  <Textarea
                    id="study-objective"
                    value={objective}
                    onChange={event => setObjective(event.target.value)}
                    placeholder="Ex.: Passar no concurso da Polícia Civil"
                    className="min-h-28 resize-none"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Seja específico para receber tópicos e metas mais úteis.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="target-date">Data alvo (opcional)</Label>
                    <Input
                      id="target-date"
                      type="date"
                      min={todayInputValue()}
                      value={targetDate}
                      onChange={event => setTargetDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weeks-count">Número de semanas</Label>
                    <Input
                      id="weeks-count"
                      type="number"
                      min={1}
                      max={52}
                      value={weeksCount}
                      onChange={event => setWeeksCount(Number(event.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours-per-week">Horas por semana</Label>
                    <Input
                      id="hours-per-week"
                      type="number"
                      min={1}
                      max={80}
                      value={hoursPerWeek}
                      onChange={event => setHoursPerWeek(Number(event.target.value))}
                      required
                    />
                  </div>
                </div>

                <TypedAlert>
                  <AlertCircle className="h-4 w-4" />
                  <TypedAlertTitle>Como a IA planeja</TypedAlertTitle>
                  <TypedAlertDescription>
                    A trilha usa o objetivo informado e conhecimento geral. Nesta versão, ela não consulta editais nem seu histórico de desempenho.
                  </TypedAlertDescription>
                </TypedAlert>

                {createMutation.error && (
                  <TypedAlert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <TypedAlertTitle>Não foi possível gerar</TypedAlertTitle>
                    <TypedAlertDescription>{getErrorMessage(createMutation.error)}</TypedAlertDescription>
                  </TypedAlert>
                )}

                <div className="flex justify-end gap-3">
                  {paths.length > 0 && (
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  )}
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={createMutation.isPending || objective.trim().length < 10}
                  >
                    {createMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparando...</>
                      : <><Sparkles className="h-4 w-4" /> Gerar trilha</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : pathsQuery.isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando trilhas...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Suas trilhas</p>
            {paths.map(path => (
              <button
                key={path.id}
                type="button"
                onClick={() => setSelectedId(path.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected?.id === path.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{path.title || path.objective}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{path.weeks_count} semanas</span>
                  <Badge variant={path.status === 'failed' ? 'destructive' : 'secondary'}>
                    {path.status === 'completed' ? 'Pronta' : path.status === 'failed' ? 'Falhou' : 'Gerando'}
                  </Badge>
                </div>
              </button>
            ))}
          </aside>

          {selected && (
            <section className="min-w-0 space-y-5">
              {['queued', 'processing'].includes(selected.status) ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">Montando sua trilha...</h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      A IA está organizando os temas, tópicos e marcos de cada semana. Você pode sair desta página e voltar depois.
                    </p>
                  </CardContent>
                </Card>
              ) : selected.status === 'failed' ? (
                <TypedAlert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <TypedAlertTitle>Não foi possível gerar esta trilha</TypedAlertTitle>
                  <TypedAlertDescription>{selected.error_message || 'Tente criar uma nova trilha em alguns minutos.'}</TypedAlertDescription>
                </TypedAlert>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex items-center gap-2 text-primary">
                            <Map className="h-5 w-5" />
                            <span className="text-sm font-semibold">Seu plano personalizado</span>
                          </div>
                          <h2 className="text-2xl font-bold text-foreground">{selected.title}</h2>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.overview}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label="Excluir trilha">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3 text-sm">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <span>{formatDate(selected.target_date)}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3 text-sm">
                          <ListChecks className="h-4 w-4 text-primary" />
                          <span>{selected.weeks_count} semanas</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3 text-sm">
                          <Clock3 className="h-4 w-4 text-primary" />
                          <span>{selected.hours_per_week}h por semana</span>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">Progresso dos marcos</span>
                          <span className="text-muted-foreground">{progress.completed}/{progress.total}</span>
                        </div>
                        <TypedProgress value={progress.percentage} />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    {selected.weeks.map(week => (
                      <Card key={week.number}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <Badge variant="outline" className="mb-2">Semana {week.number}</Badge>
                              <CardTitle className="text-lg">{week.focus}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock3 className="h-4 w-4" /> {week.estimated_hours}h
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 pt-0 md:grid-cols-2">
                          <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                              <Target className="h-4 w-4 text-primary" /> Tópicos
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {week.topics.map(topic => (
                                <li key={topic} className="flex gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {topic}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                              <CheckCircle2 className="h-4 w-4 text-primary" /> Marcos
                            </h3>
                            <div className="space-y-3">
                              {week.milestones.map((milestone, index) => {
                                const milestoneId = `${week.number}:${index}`;
                                const checked = selected.completed_milestones.includes(milestoneId);
                                return (
                                  <label key={milestoneId} className="flex cursor-pointer items-start gap-3 text-sm">
                                    <TypedCheckbox
                                      checked={checked}
                                      onCheckedChange={(value: boolean | 'indeterminate') => toggleMilestone(milestoneId, value === true)}
                                      disabled={progressMutation.isPending}
                                      aria-label={milestone}
                                    />
                                    <span className={checked ? 'text-muted-foreground line-through' : 'text-foreground'}>{milestone}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir trilha?"
        description="O plano e o progresso dos marcos serão removidos permanentemente."
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
