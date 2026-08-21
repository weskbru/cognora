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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createMutation = useMutation({
    mutationFn: (data: Pick<Subject, 'name' | 'description'>) => base44.entities.Subject.create(data),
    onSuccess: (created) => {
      queryClient.setQueryData<Subject[]>(['subjects', user?.email], (cached) => {
        if (!cached || cached.some(subject => subject.id === created.id)) return cached;
        return [created, ...cached];
      });
      navigate('/subjects');
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
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
        </form>
      </Card>
    </div>
  );
}
