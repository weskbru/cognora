import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Copy, Users, Swords, Timer, Trophy, Play, Bot, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import DuelMode from '@/components/competitions/modes/DuelMode';
import TimeAttackMode from '@/components/competitions/modes/TimeAttackMode';
import WeeklyLeagueMode from '@/components/competitions/modes/WeeklyLeagueMode';
import CompetitionResults from '@/components/competitions/CompetitionResults';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const MODE_CONFIG = {
  duel: { label: 'Duelo Rápido', icon: Swords, color: 'bg-red-100 text-red-700' },
  time_attack: { label: 'Contra o Tempo', icon: Timer, color: 'bg-blue-100 text-blue-700' },
  weekly_league: { label: 'Liga Semanal', icon: Trophy, color: 'bg-amber-100 text-amber-700' },
};

const BOT = {
  email: 'bot@studyai.app',
  display_name: '🤖 Bot',
  status: 'joined',
  score: 0, correct: 0, wrong: 0, time_spent_seconds: 0,
};

export default function CompetitionDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [playing, setPlaying] = useState(false);
  const [addingBot, setAddingBot] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: competition, isLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const results = await base44.entities.Competition.filter({ id });
      return results[0] || null;
    },
    refetchInterval: playing ? false : 5000,
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );

  if (!competition) return <div className="text-center py-20 text-muted-foreground">Competição não encontrada.</div>;

  const cfg = MODE_CONFIG[competition.mode] || MODE_CONFIG.duel;
  const isHost = competition.host_email === user?.email;
  const myParticipant = competition.participants?.find(p => p.email === user?.email);
  const myFinished = myParticipant?.status === 'finished';
  const canPlay = myParticipant && competition.status !== 'finished' && !myFinished;
  const hasBot = competition.participants?.some(p => p.email === BOT.email);

  // Duel: need exactly 2 players
  const isDuel = competition.mode === 'duel';
  const participantCount = competition.participants?.length || 0;
  const needsMorePlayers = isDuel && participantCount < 2 && competition.status === 'waiting';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(competition.invite_code);
    toast({ title: 'Código copiado!', description: `Compartilhe o código: ${competition.invite_code}` });
  };

  const handleStartCompetition = async () => {
    await base44.entities.Competition.update(id, { status: 'active' });
    queryClient.invalidateQueries({ queryKey: ['competition', id] });
  };

  const handleAddBot = async () => {
    setAddingBot(true);
    const updatedParticipants = [...(competition.participants || []), BOT];
    await base44.entities.Competition.update(id, { participants: updatedParticipants });
    queryClient.invalidateQueries({ queryKey: ['competition', id] });
    setAddingBot(false);
  };

  // When game ends, also simulate bot result if bot is present
  const handleFinish = async () => {
    setPlaying(false);
    // Simulate bot finishing if it hasn't yet
    const latest = await base44.entities.Competition.filter({ id });
    const comp = latest[0];
    if (comp && comp.participants?.some(p => p.email === BOT.email && p.status !== 'finished')) {
      const qCount = comp.question_count || 5;
      const botCorrect = Math.floor(Math.random() * (qCount + 1));
      const botWrong = qCount - botCorrect;
      const botScore = Math.max(0, botCorrect * 100 - botWrong * 10);
      const botTime = Math.floor(Math.random() * 120) + 30;
      const updatedParticipants = comp.participants.map(p =>
        p.email === BOT.email
          ? { ...p, status: 'finished', correct: botCorrect, wrong: botWrong, score: botScore, time_spent_seconds: botTime, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
          : p
      );
      const allFinished = updatedParticipants.every(p => p.status === 'finished');
      const winner = allFinished ? [...updatedParticipants].sort((a, b) => b.score - a.score)[0]?.email : undefined;
      await base44.entities.Competition.update(id, {
        participants: updatedParticipants,
        ...(allFinished ? { status: 'finished', winner_email: winner, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') } : {}),
      });
    }
    queryClient.invalidateQueries({ queryKey: ['competition', id] });
  };

  // Render gameplay
  if (playing && canPlay) {
    const props = { competition, user, onFinish: handleFinish };
    if (competition.mode === 'duel') return <DuelMode {...props} />;
    if (competition.mode === 'time_attack') return <TimeAttackMode {...props} />;
    if (competition.mode === 'weekly_league') return <WeeklyLeagueMode {...props} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/competitions">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{competition.title || cfg.label}</h1>
            <Badge className={cfg.color}><cfg.icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
            <Badge variant={competition.status === 'active' ? 'default' : competition.status === 'finished' ? 'outline' : 'secondary'}>
              {competition.status === 'waiting' ? 'Aguardando jogadores' : competition.status === 'active' ? 'Em andamento' : 'Encerrada'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Invite code */}
      <Card className="p-4 flex items-center justify-between gap-4 bg-secondary/50">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Código de convite</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-primary">{competition.invite_code}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleCopyCode}>
          <Copy className="h-3.5 w-3.5" /> Copiar
        </Button>
      </Card>

      {/* Duel: waiting for opponent */}
      {needsMorePlayers && (
        <Card className="p-5 border-dashed border-2 border-primary/30 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-foreground">Aguardando oponente...</p>
              <p className="text-sm text-muted-foreground mt-1">Compartilhe o código <span className="font-mono font-bold text-primary">{competition.invite_code}</span> ou adicione um bot para jogar agora.</p>
            </div>
            {isHost && !hasBot && (
              <Button variant="outline" className="gap-2 shrink-0" onClick={handleAddBot} disabled={addingBot}>
                <Bot className="h-4 w-4" />
                {addingBot ? 'Adicionando...' : 'Jogar vs Bot'}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Participants */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Participantes ({participantCount})
          {isDuel && <span className="text-xs text-muted-foreground font-normal">— precisa de 2</span>}
        </h3>
        <div className="space-y-2">
          {competition.participants?.map(p => (
            <div key={p.email} className={`flex items-center gap-3 p-3 rounded-lg ${p.email === user?.email ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/50'}`}>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {p.email === BOT.email ? '🤖' : (p.display_name || p.email)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.display_name || p.email.split('@')[0]}</p>
                {p.email !== BOT.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
              </div>
              <div className="text-right">
                {p.status === 'finished' ? (
                  <div>
                    <p className="text-sm font-bold text-amber-600">{p.score} pts</p>
                    <p className="text-xs text-muted-foreground">{p.correct}✓ {p.wrong}✗</p>
                  </div>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {p.status === 'joined' ? 'Aguardando' : p.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap items-center">
        {isHost && competition.status === 'waiting' && !needsMorePlayers && (
          <Button onClick={handleStartCompetition} size="lg" className="gap-2">
            <Play className="h-4 w-4" /> Iniciar Competição
          </Button>
        )}
        {canPlay && competition.status === 'active' && !myFinished && (
          <Button onClick={() => setPlaying(true)} size="lg" className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg">
            <Play className="h-5 w-5" /> Jogar Agora
          </Button>
        )}
        {competition.status === 'active' && !myParticipant && (
          <p className="text-sm text-muted-foreground">Você não está nesta competição.</p>
        )}
        {myFinished && competition.status !== 'finished' && (
          <Badge className="text-sm py-2 px-4 bg-emerald-100 text-emerald-700">✅ Você já finalizou! Aguardando os outros...</Badge>
        )}
      </div>

      {/* Live scoreboard while active */}
      {competition.status === 'active' && competition.participants?.some(p => p.status === 'finished') && (
        <CompetitionResults competition={competition} userEmail={user?.email} live />
      )}

      {/* Final Results */}
      {competition.status === 'finished' && (
        <CompetitionResults competition={competition} userEmail={user?.email} />
      )}
    </div>
  );
}