import React from 'react';
import { Flame } from 'lucide-react';

export default function StreakBadge({ streak, size = 'md' }) {
  if (!streak || streak < 1) return null;

  const isHot = streak >= 7;
  const isWarm = streak >= 3;

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };

  return (
    <div className={`inline-flex items-center rounded-full font-semibold ${sizes[size]} ${
      isHot
        ? 'bg-orange-100 text-orange-700'
        : isWarm
        ? 'bg-amber-100 text-amber-700'
        : 'bg-secondary text-muted-foreground'
    }`}>
      <Flame className={`${iconSizes[size]} ${isHot ? 'text-orange-500' : isWarm ? 'text-amber-500' : 'text-muted-foreground'}`} />
      {streak} dia{streak !== 1 ? 's' : ''}
    </div>
  );
}