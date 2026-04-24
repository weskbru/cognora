import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { Swords, Timer, Trophy, Plus, Users, Clock, ChevronRight, Zap, Trash2 } from 'lucide-react';
import CreateCompetitionDialog from '@/components/competitions/CreateCompetitionDialog';
import JoinCompetitionDialog from '@/components/competitions/JoinCompetitionDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MODE_CONFIG = {
  duel: {
    label: 'Duelo Rápido',
    icon: Swords,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200',
    bg: 'from-violet-50 to-indigo-50 border-violet-200/60 dark:from-violet-950/20 dark:to-indigo-950/20 dark:border-violet-800',
  },
  time_attack: {
    label: 'Contra o Tempo',
    icon: Timer,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
    bg: 'from-orange-50 to-amber-50 border-orange-200/60 dark:from-orange-950/20 dark:to-amber-950/20 dark:border-orange-800',
  },
  weekly_league: {
    label: 'Liga Semanal',
    icon: Trophy,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    bg: 'from-emerald-50 to-teal-50 border-emerald-200/60 dark:from-emerald-950/20 dark:to-teal-950/20 dark:border-emerald-800',
  },
};

const STATUS_CONFIG = {
  waiting: { label: 'Aguardando', variant: 'secondary' },
  active: { label: 'Em andamento', variant: 'default' },
  finished: { label: 'Encerrada', variant: 'outline' },
};

export default function Competitions() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: competitions = [], isLoading, refetch } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => base44.entities.Competition.list('-created_date', 30),
  });

  const myCompetitions = competitions.filter(c =>
    c.host_email === user?.email ||
    c.participants?.some(p => p.email === user?.email)
  );

  const openCompetitions = competitions.filter(c =>
    c.status === 'waiting' &&
    c.host_email !== user?.email &&
    !c.participants?.some(p => p.email === user?.email)
  );

  const handleJoinOpen = (code) => {
    setJoinCode(code);
    setJoinOpen(true);
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Competições" description="Desafie outros estudantes e teste seu conhecimento">
        <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
          <Zap className="h-4 w-4" /> Entrar com Código
        </Button>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Competição
        </Button>
      </PageHeader>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(MODE_CONFIG).map(([mode, cfg]) => (
          <Card
            key={mode}
            onClick={() => { setSelectedMode(mode); setCreateOpen(true); }}
            className={`p-5 bg-gradient-to-br border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${cfg.bg} ${selectedMode === mode ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                <cfg.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{cfg.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === 'duel' && '2 jogadores, 5 ou 10 questões. Quem acertar mais, vence!'}
              {mode === 'time_attack' && 'Responda o máximo em 5 ou 10 minutos. Vence quem pontuar mais!'}
              {mode === 'weekly_league' && 'Competição semanal com ranking acumulado. Melhor desempenho da semana!'}
            </p>
          </Card>
        ))}
      </div>

      {/* My Competitions */}
      <section>
        <h2 className="text-base font-semibold mb-3 text-foreground">Minhas Competições</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : myCompetitions.length === 0 ? (
          <Card className="p-8 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Você ainda não participa de nenhuma competição.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>Criar minha primeira competição</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {myCompetitions.map(c => <CompetitionRow key={c.id} competition={c} userEmail={user?.email} />)}
          </div>
        )}
      </section>

      {/* Competições Abertas */}
      {openCompetitions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 text-foreground">Competições Abertas</h2>
          <div className="space-y-3">
            {openCompetitions.map(c => (
              <CompetitionRow key={c.id} competition={c} userEmail={user?.email} onJoin={handleJoinOpen} />
            ))}
          </div>
        </section>
      )}

      <CreateCompetitionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} initialMode={selectedMode} />
      <JoinCompetitionDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={refetch} initialCode={joinCode} />
    </div>
  );
}

function CompetitionRow({ competition: c, userEmail, onJoin }) {
  const cfg = MODE_CONFIG[c.mode] || MODE_CONFIG.duel;
  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.waiting;
  const isHost = c.host_email === userEmail;
  const myParticipant = c.participants?.find(p => p.email === userEmail);
  const isMember = isHost || !!myParticipant;
  const myFinished = myParticipant?.status === 'finished';
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Competition.delete(c.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitions'] }),
  });

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Excluir a competição "${c.title || cfg.label}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate();
  };

  const handleClick = (e) => {
    if (!isMember) {
      e.preventDefault();
      onJoin?.('');
    }
  };

  return (
    <Link to={`/competitions/${c.id}`} onClick={handleClick}>
      <Card className="p-4 bg-card border border-border hover:shadow-md transition-all cursor-pointer flex items-center gap-4 dark:bg-card dark:border-border">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
          <cfg.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{c.title || cfg.label}</p>
            <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
            {isHost && <Badge variant="outline" className="text-xs">Host</Badge>}
            {myFinished && <Badge className="text-xs bg-emerald-100 text-emerald-700">Finalizado</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.participants?.length || 0} participantes</span>
            {c.question_count && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{c.question_count} questões</span>}
            {c.time_limit_seconds && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.time_limit_seconds / 60} min</span>}
            {isHost && c.invite_code && <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">#{c.invite_code}</span>}
          </div>
        </div>
        {isHost ? (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40"
            title="Excluir competição"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </Card>
    </Link>
  );
}