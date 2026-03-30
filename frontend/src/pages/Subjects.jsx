import React, { useState } from 'react';
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

const FREE_SUBJECT_LIMIT = 2;

export default function Subjects() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects', user?.email],
    queryFn: () => base44.entities.Subject.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const atLimit = subjects.length >= FREE_SUBJECT_LIMIT;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpen(false);
      setName('');
      setDescription('');
      setCreateError(null);
    },
    onError: (err) => {
      setCreateError(err?.message?.message || err?.message || 'Erro ao criar matéria');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });

  const handleCreate = (e) => {
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
            const docCount = documents.filter(d => d.subject_id === subject.id).length;
            return (
              <Card key={subject.id} className="group relative hover:shadow-md transition-shadow">
                <Link to={`/subjects/${subject.id}`} className="block p-6">
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
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            deleteMutation.mutate(subject.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold mt-4 text-foreground">{subject.name}</h3>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{subject.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {docCount} documento{docCount !== 1 ? 's' : ''}
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