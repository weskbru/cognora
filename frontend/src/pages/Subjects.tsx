import { useMemo, useState, type ComponentType, type FormEvent, type MouseEvent, type PropsWithChildren } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Trash2, MoreVertical, Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import type { DashboardSnapshot, Document, Subject } from '@/types/entities';

const FREE_SUBJECT_LIMIT = 2;
const TypedDropdownMenuContent = DropdownMenuContent as ComponentType<PropsWithChildren<{ align?: 'start' | 'center' | 'end' }>>;
const TypedDropdownMenuItem = DropdownMenuItem as ComponentType<PropsWithChildren<{
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}>>;

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'message' in message && typeof message.message === 'string') {
      return message.message;
    }
  }
  return fallback;
}

export default function Subjects() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const dashboardQueryKey = ['dashboard', user?.email] as const;
  const cachedDashboard = queryClient.getQueryData<DashboardSnapshot>(dashboardQueryKey);
  const dashboardUpdatedAt = queryClient.getQueryState(dashboardQueryKey)?.dataUpdatedAt;

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ owner_email: user!.email }),
    enabled: !!user?.email,
    initialData: () => cachedDashboard?.subjects,
    initialDataUpdatedAt: dashboardUpdatedAt,
  });

  const { data: documents = [], isSuccess: documentsLoaded } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
    initialData: () => cachedDashboard?.documents,
    initialDataUpdatedAt: dashboardUpdatedAt,
  });
  const documentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents) {
      if (document.subject_id) {
        counts.set(document.subject_id, (counts.get(document.subject_id) || 0) + 1);
      }
    }
    return counts;
  }, [documents]);

  const atLimit = subjects.length >= FREE_SUBJECT_LIMIT;

  const createMutation = useMutation({
    mutationFn: (data: Pick<Subject, 'name' | 'description'>) => base44.entities.Subject.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] });
      const previous = queryClient.getQueriesData<Subject[]>({ queryKey: ['subjects'] });
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimistic: Subject = {
        id: optimisticId,
        name: data.name,
        description: data.description,
        owner_email: user?.email,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached = []) => [optimistic, ...cached]);
      setOpen(false);
      setCreateError(null);
      return { previous, optimisticId, form: data };
    },
    onSuccess: (created, _data, context) => {
      queryClient.setQueryData(['subject', created.id], created);
      queryClient.setQueryData(['documents', 'subject', created.id], []);
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached) => {
        if (!cached) return [created];
        const replaced = cached.map(subject => subject.id === context?.optimisticId ? created : subject);
        return replaced.some(subject => subject.id === created.id) ? replaced : [created, ...replaced];
      });
      setName('');
      setDescription('');
      setCreateError(null);
    },
    onError: (error, _data, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      setName(context?.form.name ?? '');
      setDescription(context?.form.description ?? '');
      setCreateError(mutationErrorMessage(error, 'Erro ao criar matéria'));
      setOpen(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Subject.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] });
      const previous = queryClient.getQueriesData<Subject[]>({ queryKey: ['subjects'] });
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached) =>
        cached?.filter(subject => subject.id !== deletedId)
      );
      return { previous };
    },
    onError: (_error, _deletedId, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Matérias" description="Organize seus estudos por matéria">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            atLimit ? 'bg-red-100 text-red-600' : 'bg-secondary text-muted-foreground'
          }`}>
            {subjects.length}/{FREE_SUBJECT_LIMIT} matérias
          </span>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); setCreateError(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90" disabled={atLimit}>
                {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Nova Matéria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Matéria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <Input
                  placeholder="Nome da matéria"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-24"
                />
                {createError && (
                  <p className="text-xs text-destructive">{createError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma matéria criada"
          description="Crie sua primeira matéria para começar a organizar seus documentos"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const docCount = documentCounts.get(subject.id) || 0;
            const isOptimistic = subject.id.startsWith('optimistic-');
            const prepareSubjectDetail = () => {
              if (isOptimistic) return;
              void import('@/pages/SubjectDetail');
              queryClient.setQueryData(['subject', subject.id], subject);
              if (documentsLoaded) {
                queryClient.setQueryData(
                  ['documents', 'subject', subject.id],
                  documents.filter(document => document.subject_id === subject.id),
                );
              }
            };
            return (
              <Card key={subject.id} className="group relative hover:shadow-md transition-shadow">
                <Link
                  to={`/subjects/${subject.id}`}
                  aria-disabled={isOptimistic}
                  onPointerEnter={prepareSubjectDetail}
                  onPointerDown={prepareSubjectDetail}
                  onFocus={prepareSubjectDetail}
                  onClick={(event) => {
                    if (isOptimistic) {
                      event.preventDefault();
                      return;
                    }
                    prepareSubjectDetail();
                  }}
                  className={`block p-6 ${isOptimistic ? 'cursor-wait' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <TypedDropdownMenuContent align="end">
                        <TypedDropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            deleteMutation.mutate(subject.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </TypedDropdownMenuItem>
                      </TypedDropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold mt-4 text-foreground">{subject.name}</h3>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{subject.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {isOptimistic
                      ? 'Criando matéria...'
                      : `${docCount} documento${docCount !== 1 ? 's' : ''}`}
                  </p>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
