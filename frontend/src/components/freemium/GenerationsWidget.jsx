import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Zap } from 'lucide-react';

export default function GenerationsWidget() {
  const { data: status } = useQuery({
    queryKey: ['limits-status'],
    queryFn: () => base44.limits.getStatus(),
    staleTime: 30_000,
  });

  if (!status) return null;

  const { remaining, limit, used, has_daily_bonus, plan } = status;
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isEmpty = remaining === 0;

  return (
    <div className={`mx-3 mb-3 p-3 rounded-xl border transition-colors ${
      isEmpty
        ? 'bg-red-50 border-red-200'
        : has_daily_bonus
        ? 'bg-amber-50 border-amber-200'
        : 'bg-secondary border-transparent'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className={`h-3.5 w-3.5 ${isEmpty ? 'text-red-500' : 'text-primary'}`} />
          <span className="text-xs font-semibold text-foreground">Gerações hoje</span>
        </div>
        <div className="flex items-center gap-1">
          {has_daily_bonus && (
            <span title="Bônus de login ativo">
              <Zap className="h-3 w-3 text-amber-500 fill-amber-400" />
            </span>
          )}
          <span className={`text-xs font-bold ${isEmpty ? 'text-red-600' : 'text-foreground'}`}>
            {remaining}/{limit}
          </span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isEmpty ? 'bg-red-400' : pct >= 66 ? 'bg-amber-400' : 'bg-primary'
          }`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>

      {isEmpty && (
        <p className="text-xs text-red-600 mt-1.5 leading-snug">
          Limite atingido. Volte amanhã ou{' '}
          <span className="font-semibold">faça upgrade</span>.
        </p>
      )}
      {!isEmpty && has_daily_bonus && (
        <p className="text-xs text-amber-700 mt-1 leading-snug">
          +1 bônus de login ativo hoje
        </p>
      )}
    </div>
  );
}
