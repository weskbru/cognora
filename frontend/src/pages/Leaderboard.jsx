import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getLevelInfo, LEVELS } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import LeaderboardCard from '@/components/leaderboard/LeaderboardCard';
import { Trophy, Users, Flame, Star, TrendingUp } from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

export default function Leaderboard() {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking de Estudantes"
        description="Compita com outros estudantes e suba no ranking!"
      />

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <Card className="p-6 bg-gradient-to-br from-amber-50 via-background to-primary/5 border-amber-200/50">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd place */}
            <PodiumItem entry={top3[1]} rank={2} isCurrentUser={top3[1]?.user_email === user?.email} />
            {/* 1st place */}
            <PodiumItem entry={top3[0]} rank={1} isCurrentUser={top3[0]?.user_email === user?.email} isFirst />
            {/* 3rd place */}
            <PodiumItem entry={top3[2]} rank={3} isCurrentUser={top3[2]?.user_email === user?.email} />
          </div>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{ranked.length}</p>
          <p className="text-xs text-muted-foreground">Estudantes</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold">{currentUserRank > 0 ? `#${currentUserRank}` : '—'}</p>
          <p className="text-xs text-muted-foreground">Sua posição</p>
        </Card>
        <Card className="p-4 text-center">
          <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold">{currentUserEntry ? (currentUserEntry.xp || 0).toLocaleString() : 0}</p>
          <p className="text-xs text-muted-foreground">Seu XP</p>
        </Card>
      </div>

      {/* Full Ranking */}
      <Card className="p-4">
        <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Ranking Completo
        </h3>
        {ranked.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum estudante no ranking ainda.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {ranked.map((entry, i) => (
              <LeaderboardCard
                key={entry.id}
                entry={entry}
                rank={i + 1}
                isCurrentUser={entry.user_email === user?.email}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PodiumItem({ entry, rank, isCurrentUser, isFirst }) {
  const level = getLevelInfo(entry?.xp || 0);
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
  const medals = ['🥇', '🥈', '🥉'];
  const name = entry?.display_name || entry?.user_email?.split('@')[0] || 'Estudante';

  return (
    <div className={`flex flex-col items-center gap-2 ${isFirst ? 'mb-0' : 'mb-4'}`}>
      <div className="text-2xl">{LEVEL_ICONS[(level.level - 1)] || '🌱'}</div>
      <p className={`text-xs font-semibold text-center truncate max-w-[80px] ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
        {isFirst && '⭐ '}{name}
      </p>
      <p className="text-xs text-amber-600 font-bold">{(entry?.xp || 0).toLocaleString()} XP</p>
      <div className={`w-20 ${heights[rank]} rounded-t-xl flex flex-col items-center justify-start pt-2 ${
        rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-300' : 'bg-amber-700/40'
      }`}>
        <span className="text-xl">{medals[rank - 1]}</span>
        <span className="text-xs font-bold text-white mt-1">#{rank}</span>
      </div>
    </div>
  );
}