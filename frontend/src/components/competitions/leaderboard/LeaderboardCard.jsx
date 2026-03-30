import React from 'react';
import { getLevelInfo } from '@/hooks/useRewards';
import { Flame } from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardCard({ entry, rank, isCurrentUser }) {
  const level = getLevelInfo(entry.xp || 0);
  const isTop3 = rank <= 3;

  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
      isCurrentUser
        ? 'bg-primary/10 border border-primary/30'
        : isTop3
        ? 'bg-secondary/60'
        : 'hover:bg-secondary/40'
    }`}>
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {rank <= 3 ? (
          <span className="text-xl">{medals[rank - 1]}</span>
        ) : (
          <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl shrink-0 shadow-sm">
        {LEVEL_ICONS[(level.level - 1)] || '🌱'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">
            {entry.display_name || entry.user_email?.split('@')[0] || 'Estudante'}
          </p>
          {isCurrentUser && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">Você</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Nível {level.level} · {level.name}</p>
      </div>

      {/* XP + Streak */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-amber-600">{(entry.xp || 0).toLocaleString()} XP</p>
        {(entry.streak_days || 0) >= 3 && (
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs text-orange-600 font-medium">{entry.streak_days}d</span>
          </div>
        )}
      </div>
    </div>
  );
}