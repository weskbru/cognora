import React from 'react';
import { getLevelInfo, getXpProgressPercent, LEVELS } from '@/hooks/useRewards';

export default function XPProgressBar({ xp, compact = false }) {
  const level = getLevelInfo(xp);
  const percent = getXpProgressPercent(xp);
  const nextLevel = LEVELS.find(l => l.level === level.level + 1);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{percent}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">Nível {level.level} — {level.name}</span>
        <span className="text-muted-foreground">
          {xp} / {level.maxXP === Infinity ? '∞' : level.maxXP} XP
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      {nextLevel && (
        <p className="text-xs text-muted-foreground text-right">
          Faltam {nextLevel.minXP - xp} XP para {nextLevel.name}
        </p>
      )}
    </div>
  );
}