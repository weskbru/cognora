import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Activity, ArrowRight, BarChart3, Clock, Flame, Gamepad2,
  Plus, Shield, Swords, Target, Timer, Trash2, Trophy, Users, Zap,
} from 'lucide-react';
import CreateCompetitionDialog from '@/components/competitions/CreateCompetitionDialog';
import JoinCompetitionDialog from '@/components/competitions/JoinCompetitionDialog';
import { getLevelInfo } from '@/hooks/useRewards';

const MODE_CONFIG = {
  duel: {
    label: 'Duelo Rápido',
    shortLabel: 'Duelo',
    icon: Swords,
    badge: 'Mais jogado',
    description: '2 jogadores, 5 ou 10 questões. Quem acertar mais, vence!',
    meta: '2 jogadores',
    duration: '~3 min',
    accent: 'ring',
    card: 'border-ring/40 bg-card hover:border-ring/80',
    iconBox: 'bg-ring/15 text-ring',
    button: 'bg-ring hover:bg-ring/80',
    progress: 'from-ring to-ring/60',
  },
  time_attack: {
    label: 'Contra o Tempo',
    shortLabel: 'Contra o Tempo',
    icon: Timer,
    badge: 'Desafio',
    description: 'Responda o máximo em 5 ou 10 minutos. Vence quem pontuar mais!',
    meta: 'Solo',
    duration: '5 - 10 min',
    accent: 'orange',
    card: 'border-orange-300 bg-card hover:border-orange-500 dark:border-orange-500/40',
    iconBox: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    button: 'bg-orange-600 hover:bg-orange-500',
    progress: 'from-orange-500 to-amber-400',
  },
  weekly_league: {
    label: 'Liga Semanal',
    shortLabel: 'Liga Semanal',
    icon: Trophy,
    badge: 'Ranking',
    description: 'Competição semanal com ranking acumulado. Melhor desempenho da semana!',
    meta: 'Todos',
    duration: '7 dias',
    accent: 'emerald',
    card: 'border-emerald-300 bg-card hover:border-emerald-500 dark:border-emerald-500/40',
    iconBox: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    button: 'bg-emerald-700 hover:bg-emerald-600',
    progress: 'from-emerald-500 to-lime-400',
  },
};

const STATUS_CONFIG = {
  waiting: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' },
  active: { label: 'Ao vivo', cls: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30' },
  finished: { label: 'Encerrada', cls: 'bg-secondary text-muted-foreground border-border' },
};

function getName(entry) {
  return entry?.display_name || entry?.user_email?.split('@')[0] || entry?.email?.split('@')[0] || 'Estudante';
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export default function Competitions() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: competitions = [], isLoading, refetch } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => base44.entities.Competition.list('-created_date', 30),
  });
  const { data: allProgress = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserProgress.list('-xp', 50),
  });

  useEffect(() => {
    if (!competitions.length) return;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = competitions.filter(c =>
      c.status === 'waiting' && new Date(c.created_date).getTime() < cutoff
    );
    if (!stale.length) return;
    Promise.all(stale.map(c => base44.entities.Competition.delete(c.id)))
      .then(() => queryClient.invalidateQueries({ queryKey: ['competitions'] }));
  }, [competitions, queryClient]);

  const ranked = useMemo(
    () => [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0)),
    [allProgress]
  );
  const currentProgress = ranked.find(entry => entry.user_email === user?.email);
  const currentRank = ranked.findIndex(entry => entry.user_email === user?.email) + 1;
  const activeCompetitions = competitions.filter(c => c.status === 'active');
  const myCompetitions = competitions.filter(c =>
    c.host_email === user?.email || c.participants?.some(p => p.email === user?.email)
  );
  const recentCompetitions = myCompetitions.filter(c => c.status === 'finished').slice(0, 4);
  const openCompetitions = competitions.filter(c =>
    c.status === 'waiting' &&
    c.host_email !== user?.email &&
    !c.participants?.some(p => p.email === user?.email)
  );
  const onlineStudents = new Set(
    activeCompetitions.flatMap(c => (c.participants || []).map(p => p.email))
  ).size;

  const handleJoinOpen = (code = '') => {
    setJoinCode(code);
    setJoinOpen(true);
  };

  return (
    <div className="-m-4 min-h-[calc(100vh-70px)] bg-background p-4 text-foreground md:-m-8 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/25">
              <Trophy className="h-8 w-8 fill-amber-300/30" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-ring">Arena competitiva</p>
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Competições</h1>
              <p className="mt-1 text-sm text-muted-foreground">Desafie outros estudantes e teste seu conhecimento.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleJoinOpen()}
              className="gap-2 border-ring/60 bg-transparent text-ring hover:bg-ring/10 hover:text-ring"
            >
              <Zap className="h-4 w-4" /> Entrar com código
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-ring text-white hover:bg-ring/80">
              <Plus className="h-4 w-4" /> Nova competição
            </Button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-ring/40 bg-gradient-to-r from-slate-950 via-slate-950 to-ring/50 p-5 shadow-lg shadow-ring/20">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ring/25 blur-3xl" />
          <div className="absolute bottom-0 right-5 text-ring/10">
            <Trophy className="h-36 w-36" />
          </div>
          <div className="relative grid gap-5 sm:grid-cols-3">
            <ArenaStat
              icon={Activity}
              iconClass="text-emerald-300"
              label="Jogando agora"
              value={`${onlineStudents} ${onlineStudents === 1 ? 'aluno online' : 'alunos online'}`}
              detail={`${activeCompetitions.length} ${activeCompetitions.length === 1 ? 'partida ativa' : 'partidas ativas'}`}
            />
            <ArenaStat
              icon={Flame}
              iconClass="text-orange-300"
              label="Sequência ativa"
              value={`${currentProgress?.streak_days || 0} dias`}
              detail="Continue assim!"
            />
            <ArenaStat
              icon={Trophy}
              iconClass="text-amber-300"
              label="Sua melhor posição"
              value={currentRank > 0 ? `#${currentRank}` : '—'}
              detail="No ranking geral"
              last
            />
          </div>
        </section>

        <section>
          <SectionTitle icon={Gamepad2} title="Modos de competição" />
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(MODE_CONFIG).map(([mode, cfg]) => (
              <ModeCard
                key={mode}
                mode={mode}
                cfg={cfg}
                onClick={() => {
                  if (mode === 'weekly_league') return;
                  setSelectedMode(mode);
                  setCreateOpen(true);
                }}
              />
            ))}
          </div>
        </section>

        {activeCompetitions.length > 0 && (
          <section>
            <SectionTitle icon={Shield} title="Competições ao vivo" action="Ver todas" />
            <div className="grid gap-3 lg:grid-cols-3">
              {activeCompetitions.slice(0, 3).map(c => (
                <LiveCompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle icon={Trophy} title="Ranking semanal" action="Ver ranking completo" actionPath="/leaderboard" />
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {ranked.length === 0 ? (
              <EmptyArena text="A liga ainda está esperando seus primeiros competidores." />
            ) : (
              ranked.slice(0, 5).map((entry, index) => (
                <LeagueRow key={entry.id} entry={entry} rank={index + 1} isCurrentUser={entry.user_email === user?.email} topXP={ranked[0]?.xp || 1} />
              ))
            )}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div>
            <SectionTitle icon={Swords} title="Suas competições" />
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />)}
              </div>
            ) : myCompetitions.length === 0 ? (
              <EmptyArena
                text="Você ainda não participa de nenhuma competição."
                action="Criar minha primeira competição"
                onAction={() => setCreateOpen(true)}
              />
            ) : (
              <div className="space-y-2.5">
                {myCompetitions.slice(0, 6).map(c => (
                  <CompetitionRow key={c.id} competition={c} userEmail={user?.email} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={Target} title="Competições abertas" />
            {openCompetitions.length === 0 ? (
              <EmptyArena text="Nenhuma competição aberta no momento. Crie uma ou entre com um código." />
            ) : (
              <div className="space-y-2.5">
                {openCompetitions.slice(0, 5).map(c => (
                  <CompetitionRow key={c.id} competition={c} userEmail={user?.email} onJoin={handleJoinOpen} />
                ))}
              </div>
            )}
          </div>
        </section>

        {recentCompetitions.length > 0 && (
          <section>
            <SectionTitle icon={Clock} title="Suas competições recentes" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recentCompetitions.map(c => <RecentCompetitionCard key={c.id} competition={c} userEmail={user?.email} />)}
            </div>
          </section>
        )}
      </div>

      <CreateCompetitionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} initialMode={selectedMode} />
      <JoinCompetitionDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={refetch} initialCode={joinCode} />
    </div>
  );
}

function ArenaStat({ icon: Icon, iconClass, label, value, detail, last = false }) {
  return (
    <div className={`min-w-0 ${last ? '' : 'sm:border-r sm:border-ring/20 sm:pr-5'}`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Icon className={`h-4 w-4 ${iconClass}`} /> {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action, actionPath }) {
  const content = action && (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80">
      {action} <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
        <Icon className="h-5 w-5 text-ring" /> {title}
      </h2>
      {actionPath ? <Link to={actionPath}>{content}</Link> : content}
    </div>
  );
}

function ModeCard({ mode, cfg, onClick }) {
  const isLeague = mode === 'weekly_league';
  return (
    <div className={`rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-xl ${cfg.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.iconBox}`}>
          <cfg.icon className="h-7 w-7" />
        </div>
        <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${cfg.iconBox}`}>{cfg.badge}</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground">{cfg.label}</h3>
      <p className="mt-2 min-h-14 text-sm leading-relaxed text-muted-foreground">{cfg.description}</p>
      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {cfg.meta}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {cfg.duration}</span>
      </div>
      {isLeague ? (
        <Link to="/leaderboard" className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-black text-white transition-colors ${cfg.button}`}>
          <BarChart3 className="h-4 w-4" /> Ver ranking
        </Link>
      ) : (
        <button onClick={onClick} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-black text-white transition-colors ${cfg.button}`}>
          <Zap className="h-4 w-4" /> Jogar agora
        </button>
      )}
    </div>
  );
}

function LiveCompetitionCard({ competition }) {
  const cfg = MODE_CONFIG[competition.mode] || MODE_CONFIG.duel;
  const participants = competition.participants || [];
  const first = participants[0];
  const second = participants[1];
  const total = competition.question_count || 5;
  const completed = Math.max(...participants.map(p => (p.correct || 0) + (p.wrong || 0)), 0);

  return (
    <Link to={`/competitions/${competition.id}`} className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-ring/60 hover:bg-secondary">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ring"><cfg.icon className="h-3.5 w-3.5" /> {cfg.shortLabel}</p>
        <Badge className="border border-red-500/30 bg-red-500/20 text-[10px] font-black uppercase text-red-200 hover:bg-red-500/20">Ao vivo</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <PlayerMini participant={first} />
        <span className="text-xs font-black text-muted-foreground">VS</span>
        <PlayerMini participant={second} fallback="?" />
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] text-muted-foreground">{completed} / {total} questões</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className={`h-full rounded-full bg-gradient-to-r ${cfg.progress}`} style={{ width: `${Math.min(100, (completed / total) * 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}

function PlayerMini({ participant, fallback = '—' }) {
  const name = participant ? getName(participant) : 'Aguardando';
  return (
    <div className="min-w-0 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-ring/60 bg-ring text-sm font-black text-white">
        {participant ? getInitials(name) : fallback}
      </div>
      <p className="mt-1 max-w-20 truncate text-xs font-bold text-foreground">{name}</p>
      {participant && <p className="text-[10px] text-amber-300">{participant.score || 0} pts</p>}
    </div>
  );
}

function LeagueRow({ entry, rank, isCurrentUser, topXP }) {
  const name = getName(entry);
  const level = getLevelInfo(entry.xp || 0);
  const width = Math.max(8, Math.round(((entry.xp || 0) / topXP) * 100));
  return (
    <div className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 ${isCurrentUser ? 'bg-primary/10' : ''}`}>
      <div className="w-7 text-center text-sm font-black text-muted-foreground">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ring text-xs font-black text-white">{getInitials(name)}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          {isCurrentUser && <span className="rounded-full bg-ring/20 px-2 py-0.5 text-[9px] font-black uppercase text-ring">Você</span>}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">Nv. {level.level}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-ring" style={{ width: `${width}%` }} />
        </div>
      </div>
      <p className="shrink-0 text-sm font-black text-amber-300">{(entry.xp || 0).toLocaleString('pt-BR')} XP</p>
    </div>
  );
}

function CompetitionRow({ competition: c, userEmail, onJoin }) {
  const cfg = MODE_CONFIG[c.mode] || MODE_CONFIG.duel;
  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.waiting;
  const isHost = c.host_email === userEmail;
  const isMember = isHost || !!c.participants?.some(p => p.email === userEmail);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Competition.delete(c.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitions'] }),
  });

  const handleClick = (e) => {
    if (!isMember) {
      e.preventDefault();
      onJoin?.('');
    }
  };

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir competição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-semibold text-foreground">"{c.title || cfg.label}"</span>?
              Todos os dados e participantes serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Link to={`/competitions/${c.id}`} onClick={handleClick} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-ring/60 hover:bg-secondary">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.iconBox}`}><cfg.icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">{c.title || cfg.label}</p>
            <Badge className={`border text-[10px] uppercase ${status.cls}`}>{status.label}</Badge>
            {isHost && <Badge className="border border-ring/20 bg-ring/10 text-[10px] text-ring">HOST</Badge>}
          </div>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.participants?.length || 0}</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {c.question_count || 0} questões</span>
          </p>
        </div>
        {isHost ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </Link>
    </>
  );
}

function RecentCompetitionCard({ competition, userEmail }) {
  const cfg = MODE_CONFIG[competition.mode] || MODE_CONFIG.duel;
  const myParticipant = competition.participants?.find(p => p.email === userEmail);
  const won = competition.winner_email === userEmail;
  return (
    <Link to={`/competitions/${competition.id}`} className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${won ? 'border-emerald-500/25 bg-emerald-50 dark:bg-emerald-950/20' : 'border-red-500/20 bg-red-50 dark:bg-red-950/15'}`}>
      <div className="flex items-center gap-2">
        <cfg.icon className={`h-5 w-5 ${won ? 'text-emerald-300' : 'text-red-300'}`} />
        <div>
          <p className={`text-xs font-black uppercase ${won ? 'text-emerald-300' : 'text-red-300'}`}>{won ? 'Vitória' : 'Encerrada'}</p>
          <p className="text-xs text-muted-foreground">{cfg.label}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-black text-foreground">{myParticipant?.correct || 0}/{competition.question_count || 0} questões</p>
      <p className="mt-2 text-xs font-bold text-emerald-300">{myParticipant?.score || 0} pts</p>
    </Link>
  );
}

function EmptyArena({ text, action, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-ring/30 bg-card px-5 py-8 text-center">
      <Swords className="mx-auto mb-3 h-8 w-8 text-ring/50" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <Button onClick={onAction} className="mt-4 bg-ring text-white hover:bg-ring/80">{action}</Button>}
    </div>
  );
}
