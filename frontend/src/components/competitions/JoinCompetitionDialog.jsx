import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function JoinCompetitionDialog({ open, onOpenChange, onJoined }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    const results = await base44.entities.Competition.filter({ invite_code: code.trim().toUpperCase() });
    if (!results.length) {
      setError('Código inválido. Verifique e tente novamente.');
      setLoading(false);
      return;
    }

    const competition = results[0];
    if (competition.status === 'finished') {
      setError('Esta competição já foi encerrada.');
      setLoading(false);
      return;
    }

    const alreadyIn = competition.participants?.some(p => p.email === user.email);
    if (!alreadyIn) {
      const updatedParticipants = [
        ...(competition.participants || []),
        { email: user.email, display_name: user.full_name || user.email.split('@')[0], status: 'joined', score: 0, correct: 0, wrong: 0, time_spent_seconds: 0 },
      ];
      await base44.entities.Competition.update(competition.id, { participants: updatedParticipants });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      onJoined?.();
    }

    onOpenChange(false);
    navigate(`/competitions/${competition.id}`);
    setCode('');
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrar com Código</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">Digite o código de convite compartilhado pelo criador da competição.</p>
          <Input
            placeholder="Ex: ABC123"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="font-mono text-center text-lg tracking-widest"
            maxLength={6}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleJoin} disabled={loading || !code.trim()}>
              {loading ? 'Buscando...' : 'Entrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}