import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Swords, Timer, Trophy } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

const MODES = [
  { value: 'duel', label: 'Duelo Rápido', icon: Swords, description: '2 jogadores, mais acertos vence' },
  { value: 'time_attack', label: 'Contra o Tempo', icon: Timer, description: 'Responda o máximo no tempo limite' },
  { value: 'weekly_league', label: 'Liga Semanal', icon: Trophy, description: 'Ranking acumulado da semana' },
];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateCompetitionDialog({ open, onOpenChange, onCreated, initialMode }) {
  const [mode, setMode] = useState(initialMode || 'duel');

  useEffect(() => {
    if (open) setMode(initialMode || 'duel');
  }, [open, initialMode]);
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [timeLimit, setTimeLimit] = useState('300');
  const [subjectId, setSubjectId] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const data = {
        title: title.trim() || MODES.find(m => m.value === mode)?.label,
        mode,
        status: 'waiting',
        host_email: user.email,
        invite_code: generateCode(),
        question_count: parseInt(questionCount),
        participants: [{ email: user.email, display_name: user.full_name || user.email.split('@')[0], status: 'joined', score: 0, correct: 0, wrong: 0, time_spent_seconds: 0 }],
        questions: [],
        ...(subjectId ? { subject_id: subjectId } : {}),
        ...(mode === 'time_attack' ? { time_limit_seconds: parseInt(timeLimit) } : {}),
        ...(mode === 'weekly_league' ? {
          week_start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          week_end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          time_limit_seconds: 0,
        } : {}),
      };
      return base44.entities.Competition.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      onCreated?.();
      onOpenChange(false);
      setTitle(''); setMode('duel'); setSubjectId('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Competição</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`p-3 rounded-xl border text-center transition-all ${mode === m.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
              >
                <m.icon className={`h-5 w-5 mx-auto mb-1 ${mode === m.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-medium leading-tight ${mode === m.value ? 'text-primary' : 'text-muted-foreground'}`}>{m.label}</p>
              </button>
            ))}
          </div>

          <Input placeholder="Nome da competição (opcional)" value={title} onChange={e => setTitle(e.target.value)} />

          <div>
            <label className="text-sm font-medium mb-1.5 block">Matéria (opcional)</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Todas as matérias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas as matérias</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {mode !== 'weekly_league' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Número de questões</label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questões</SelectItem>
                  <SelectItem value="10">10 questões</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'time_attack' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tempo limite</label>
              <Select value={timeLimit} onValueChange={setTimeLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5 minutos</SelectItem>
                  <SelectItem value="600">10 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'weekly_league' && (
            <p className="text-xs text-muted-foreground bg-secondary p-3 rounded-lg">
              A liga dura até o final da semana atual. Qualquer número de questões pode ser respondido. Vence quem tiver mais acertos e melhor desempenho acumulado.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Competição'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}