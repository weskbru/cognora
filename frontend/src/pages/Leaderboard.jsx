import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getLevelInfo, getXpProgressPercent } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp, Bolt, CalendarDays, ChevronUp, Crown, Flame,
  Medal, Shield, Sparkles, Star, Target, Trophy, Users,
} from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

const RANK_STYLES = {
  1: {
    badge: 'bg-amber-400 text-amber-950 shadow-amber-200',
    avatar: 'from-amber-300 to-orange-500 ring-amber-200',
    progress: 'from-amber-400 to-orange-500',
  },
  2: {
    badge: 'bg-slate-300 text-slate-800 shadow-slate-200',
    avatar: 'from-slate-300 to-slate-500 ring-slate-200',
    progress: 'from-slate-400 to-slate-600',
  },
  3: {
    badge: 'bg-orange-700 text-orange-50 shadow-orange-200',
    avatar: 'from-orange-400 to-orange-700 ring-orange-200',
    progress: 'from-orange-500 to-orange-700',
  },
};

const DEFAULT_STYLE = {
  badge: 'bg-slate-100 text-slate-500 shadow-slate-100 dark:bg-slate-800 dark:text-slate-300',
  avatar: 'from-indigo-500 to-violet-600 ring-indigo-100 dark:ring-indigo-900',
  progress: 'from-indigo-500 to-violet-500',
};

function getName(entry) {
  return entry?.display_name || entry?.user_email?.split('@')[0] || 'Estudante';
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function PodiumPlayer({ entry, rank, currentUserEmail }) {
  if (!entry) return <div className="w-24 sm:w-32" />;
  const name = getName(entry);
  const isCurrentUser = entry.user_email === currentUserEmail;
  const style = RANK_STYLES[rank];
  const heights = { 1: 'h-24 sm:h-28', 2: 'h-16 sm:h-20', 3: 'h-12 sm:h-16' };
  const sizes = { 1: 'h-16 w-16 text-lg', 2: 'h-12 w-12 text-sm', 3: 'h-12 w-12 text-sm' };

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      <div className="mb-2 flex h-6 items-center">
        {rank === 1 ? <Crown className="h-6 w-6 fill-amber-300 text-amber-500" /> : <Medal className="h-5 w-5 text-slate-400" />}
      </div>
      <div className={`flex ${sizes[rank]} items-center justify-center rounded-2xl bg-gradient-to-br ${style.avatar} font-extrabold text-white shadow-lg ring-4`}>
        {getInitials(name)}
      </div>
      <p className="mt-2 max-w-full truncate text-xs font-bold text-slate-800 dark:text-slate-100">{name}</p>
      <p className="text-[11px] font-semibold text-slate-500">{(entry.xp || 0).toLocaleString('pt-BR')} XP</p>
      {isCurrentUser && <span className="mt-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">VOCÊ</span>}
      <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b ${style.progress} pt-2 text-sm font-black text-white shadow-lg ${heights[rank]}`}>
        #{rank}
      </div>
    </div>
  );
}

function ArenaRow({ entry, rank, currentUserEmail, topXP }) {
  const xp = entry.xp || 0;
  const level = getLevelInfo(xp);
  const style = RANK_STYLES[rank] || DEFAULT_STYLE;
  const name = getName(entry);
  const isCurrentUser = entry.user_email === currentUserEmail;
  const relativeProgress = topXP > 0 ? Math.max(6, Math.round((xp / topXP) * 100)) : 0;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-3.5 transition-all sm:p-4 ${
      isCurrentUser
        ? 'border-indigo-300 bg-indigo-50/80 shadow-md shadow-indigo-100/60 dark:border-indigo-700 dark:bg-indigo-950/30 dark:shadow-none'
        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ${style.badge}`}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.avatar} text-sm font-extrabold text-white ring-2`}>
          {getInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{name}</p>
            {isCurrentUser && <Badge className="bg-indigo-600 px-1.5 py-0 text-[9px] text-white hover:bg-indigo-600">VOCÊ</Badge>}
            <span className="text-[11px] font-semibold text-slate-400">
              {LEVEL_ICONS[level.level - 1]} Nv. {level.level} {level.name}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${style.progress} transition-all duration-500`}
              style={{ width: `${relativeProgress}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black text-slate-900 dark:text-white">{xp.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">XP semanal</p>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserProgress.list('-xp', 50),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const ranked = useMemo(
    () => [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0)),
    [allProgress]
  );

  const currentUserIndex = ranked.findIndex(entry => entry.user_email === user?.email);
  const currentUserRank = currentUserIndex + 1;
  const currentUserEntry = currentUserIndex >= 0 ? ranked[currentUserIndex] : null;
  const nextStudent = currentUserIndex > 0 ? ranked[currentUserIndex - 1] : null;
  const xpToOvertake = nextStudent
    ? Math.max(1, (nextStudent.xp || 0) - (currentUserEntry?.xp || 0) + 1)
    : 0;
  const nextLevelProgress = getXpProgressPercent(currentUserEntry?.xp || 0);
  const top3 = ranked.slice(0, 3);
  const topXP = ranked[0]?.xp || 1;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl shadow-indigo-100 dark:shadow-none sm:p-7">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200">
                <Flame className="h-3.5 w-3.5 fill-amber-300" /> Liga semanal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-100">
                <CalendarDays className="h-3.5 w-3.5" /> Temporada em andamento
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Arena de Estudos</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100/80 sm:text-base">
              Ganhe XP estudando, suba posições e termine a semana no topo da liga.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Competidores</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-black"><Users className="h-4 w-4" /> {ranked.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Sua posição</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-black"><Trophy className="h-4 w-4 text-amber-300" /> {currentUserRank || '—'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-b from-amber-50/80 to-white p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Zona de glória</p>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Pódio da semana</h2>
            </div>
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          {top3.length > 0 ? (
            <div className="flex items-end justify-center gap-2 pt-3 sm:gap-5">
              <PodiumPlayer entry={top3[1]} rank={2} currentUserEmail={user?.email} />
              <PodiumPlayer entry={top3[0]} rank={1} currentUserEmail={user?.email} />
              <PodiumPlayer entry={top3[2]} rank={3} currentUserEmail={user?.email} />
            </div>
          ) : (
            <div className="py-14 text-center text-sm text-slate-500">O primeiro lugar ainda está esperando por alguém.</div>
          )}
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Seu próximo alvo</p>
              <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                {nextStudent ? `Ultrapasse ${getName(nextStudent)}` : 'Você está no topo'}
              </h2>
            </div>
            <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              {nextStudent ? <Target className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>
          </div>

          <div className="my-5 rounded-2xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900 dark:bg-slate-900/70">
            <p className="text-sm text-slate-500">
              {nextStudent ? 'Faltam apenas' : 'Sua vantagem começa com'}
            </p>
            <p className="mt-1 text-3xl font-black text-indigo-700 dark:text-indigo-300">
              {nextStudent ? xpToOvertake.toLocaleString('pt-BR') : (currentUserEntry?.xp || 0).toLocaleString('pt-BR')} XP
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {nextStudent ? 'para conquistar a próxima posição' : 'Continue estudando para defender o primeiro lugar'}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">Progresso do seu nível</span>
              <span className="font-bold text-indigo-600">{nextLevelProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${nextLevelProgress}%` }} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-100/70 px-3 py-2.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
            <Bolt className="h-4 w-4 fill-indigo-500 text-indigo-500" />
            Responda questões e envie materiais para acelerar sua subida.
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Classificação atual</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Disputa pela liderança</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Shield className="h-4 w-4 text-indigo-500" /> Top 3 entra na zona de glória
          </div>
        </div>

        {ranked.length === 0 ? (
          <Card className="py-14 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-indigo-300" />
            <p className="text-sm font-semibold text-slate-500">Ainda não há competidores. Conquiste o primeiro lugar.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {ranked.map((entry, index) => (
              <ArenaRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
                currentUserEmail={user?.email}
                topXP={topXP}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-center gap-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-400" /> XP atualizado em tempo real</span>
        <span className="flex items-center gap-1"><ChevronUp className="h-3.5 w-3.5 text-indigo-500" /> Cada sessão pode mudar o ranking</span>
        <span className="flex items-center gap-1"><ArrowUp className="h-3.5 w-3.5 text-emerald-500" /> Continue avançando</span>
      </div>
    </div>
  );
}
