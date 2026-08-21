import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Subject } from '@/types/entities';

interface CreateSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (subject: Subject) => void;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'message' in message && typeof message.message === 'string') {
      return message.message;
    }
  }
  return 'Erro ao criar matéria';
}

export default function CreateSubjectDialog({ open, onOpenChange, onCreated }: CreateSubjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
        created_date: new Date().toISOString(),
      };
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached = []) => [optimistic, ...cached]);
      onOpenChange(false);
      return { previous, optimisticId };
    },
    onSuccess: (subject, _data, context) => {
      queryClient.setQueryData(['subject', subject.id], subject);
      queryClient.setQueryData(['documents', 'subject', subject.id], []);
      queryClient.setQueriesData<Subject[]>({ queryKey: ['subjects'] }, (cached = []) => {
        const replaced = cached.map(item => item.id === context?.optimisticId ? subject : item);
        return replaced.some(item => item.id === subject.id) ? replaced : [subject, ...replaced];
      });
      setName('');
      setDescription('');
      setCreateError(null);
      onCreated?.(subject);
    },
    onError: (error, _data, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      setCreateError(errorMessage(error));
      onOpenChange(true);
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

  const handleOpenChange = (nextOpen: boolean) => {
    setCreateError(null);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Matéria</DialogTitle>
          <DialogDescription className="sr-only">
            Informe o nome e, opcionalmente, uma descrição para criar a matéria.
          </DialogDescription>
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
