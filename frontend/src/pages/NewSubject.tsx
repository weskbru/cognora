import { useState, type FormEvent } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import type { Subject } from '@/types/entities';

export default function NewSubject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      navigate('/subjects');
      return { previous, optimisticId };
    },
    onSuccess: (created, _data, context) => {
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached = []) => {
        const replaced = cached.map(subject => subject.id === context?.optimisticId ? created : subject);
        return replaced.some(subject => subject.id === created.id) ? replaced : [created, ...replaced];
      });
    },
    onError: (error, _data, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      setCreateError(error instanceof Error ? error.message : 'Não foi possível criar a matéria.');
      navigate('/subjects/new', { replace: true });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateError(null);
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div>
      <Link to="/subjects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader title="Nova Matéria" description="Crie uma nova matéria para organizar seus estudos" />

      <Card className="max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Matemática, Biologia..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Descrição</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da matéria (opcional)" className="h-24" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/subjects')}>Cancelar</Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Matéria'}
            </Button>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
        </form>
      </Card>
    </div>
  );
}
