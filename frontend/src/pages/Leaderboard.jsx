import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getLevelInfo } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { Trophy, Users, Star, TrendingUp, ChevronDown } from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

const GRADIENTS = [
  'from-amber-400 to-yellow-500',
  'from-slate-400 to-slate-500',
  'from-amber-700 to-orange-600',
  'from-primary to-primary/70',
];

function getGradient(r) {
  if (r <= 3) return GRADIENTS[r - 1];
  return GRADIENTS[3];
}

function PodiumItem({ entry, rank, isCurrentUser, isFirst = false }) {
  const level = getLevelInfo(entry?.xp || 0);
  const name = entry?.display_name || entry?.user_email?.split('@')[0] || 'Estudante';
  const gradient = getGradient(rank);

  const barHeights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
  const barColors  = {
    1: 'bg-gradient-to-t from-amber-500 to-amber-400',
    2: 'bg-gradient-to-t from-slate-400 to-slate-300',
    3: 'bg-gradient-to-t from-amber-800 to-amber-600',
  };
  const rankLabel  = { 1: '#1', 2: '#2', 3: '#3' };
  const rankTextColor = { 1: 'text-amber-800', 2: 'text-slate-600', 3: 'text-amber-900' };

  return (
    <div className={`flex flex-col items-center gap-1.5 ${isFirst ? 'mb-0 -mt-4' : 'mt-4'}`}>
      {/* Medal/Icon above avatar */}
      <div className="text-xl mb-0.5">
        {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
      </div>

      {/* Avatar */}
      <div className={`relative ${isFirst ? 'h-16 w-16' : 'h-12 w-12'} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg border-2 ${isFirst ? 'border-amber-300 text-2xl' : 'border-white/40 text-lg'}`}>
        {(name[0] || '?').toUpperCase()}
        {isFirst && (
          <div className="absolute -top-2 -right-2 h-5 w-5 bg-amber-400 rounded-full flex items-center justify-center text-xs shadow">
            ⭐
          </div>
        )}
      </div>

      {/* Name + XP */}
      <p className={`text-xs font-semibold text-center truncate max-w-[80px] ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
        {name}
      </p>
      <p className="text-xs text-amber-600 font-bold">{(entry?.xp || 0).toLocaleString('pt-BR')} XP</p>
      {isCurrentUser && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Você</Badge>
      )}

      {/* Podium bar */}
      <div className={`w-24 ${barHeights[rank]} ${barColors[rank]} rounded-t-xl flex flex-col items-center justify-start pt-2 shadow-md`}>
        <span className={`text-sm font-bold ${rankTextColor[rank]}`}>{rankLabel[rank]}</span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [period] = useState('Esta Semana');

  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserProgress.list('-xp', 50),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const ranked = useMemo(() =>
    [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0)),
    [allProgress]
  );

  const currentUserRank = ranked.findIndex(p => p.user_email === user?.email) + 1;
  const currentUserEntry = ranked.find(p => p.user_email === user?.email);
  const top3 = ranked.slice(0, 3);
  const maxXP = ranked[0]?.xp || 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Ranking de Estudantes"
        description="Compita com outros estudantes e suba no ranking!"
      />

      {/* Podium */}
      {top3.length >= 2 && (
        <Card className="p-6 pb-0 overflow-hidden bg-gradient-to-br from-amber-50/60 via-background to-primary/5 border border-amber-200/40">
          <div className="flex items-end justify-center gap-6">
            {top3[1] && (
              <PodiumItem entry={top3[1]} rank={2} isCurrentUser={top3[1]?.user_email === user?.email} />
            )}
            <PodiumItem entry={top3[0]} rank={1} isCurrentUser={top3[0]?.user_email === user?.email} isFirst />
            {top3[2] && (
              <PodiumItem entry={top3[2]} rank={3} isCurrentUser={top3[2]?.user_email === user?.email} />
            )}
          </div>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-2 opacity-70" />
          <p className="text-xl font-bold text-foreground">{ranked.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Usuários</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-2 opacity-80" />
          <p className="text-xl font-bold text-foreground">{currentUserRank > 0 ? `#${currentUserRank}` : '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sua posição</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400 opacity-90" />
          </div>
          <p className="text-xl font-bold text-foreground">{currentUserEntry ? (currentUserEntry.xp || 0).toLocaleString('pt-BR') : 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Seu XP</p>
        </Card>
      </div>

      {/* Full Ranking */}
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ranking Completo
          </h3>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors">
            {period}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Rows */}
        {ranked.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground px-5">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum estudante no ranking ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {ranked.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.user_email === user?.email;
              const level = getLevelInfo(entry.xp || 0);
              const barPct = maxXP > 0 ? Math.round(((entry.xp || 0) / maxXP) * 100) : 0;
              const name = entry.display_name || entry.user_email?.split('@')[0] || 'Estudante';
              const gradient = getGradient(rank);

              const rankBg = rank === 1
                ? 'bg-amber-400 text-amber-900'
                : rank === 2
                ? 'bg-slate-300 text-slate-700'
                : rank === 3
                ? 'bg-amber-700/60 text-amber-100'
                : 'bg-secondary text-muted-foreground';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                    isMe ? 'bg-primary/5' : 'hover:bg-secondary/30'
                  }`}
                >
                  {/* Rank badge */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${rankBg}`}>
                    {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
                  </div>

                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
                    {(name[0] || '?').toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                        {name}
                      </p>
                      {isMe && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Você</Badge>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {LEVEL_ICONS[level.level - 1]} {level.name}
                      </span>
                    </div>
                    {/* XP progress bar */}
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* XP */}
                  <p className={`text-sm font-bold shrink-0 ${
                    rank === 1 ? 'text-amber-500' : isMe ? 'text-primary' : 'text-foreground'
                  }`}>
                    {(entry.xp || 0).toLocaleString('pt-BR')} XP
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {ranked.length > 0 && (
          <div className="px-5 py-4 border-t border-border">
            <button className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
              Ver Rank Completo <span className="text-primary">›</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
