import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRewardsContext } from '@/context/RewardsContext';
import { getLevelInfo, getXpProgressPercent, LEVELS, XP_REWARDS } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame, Star, Zap, FileText, CheckCircle2, Trophy,
  TrendingUp, Crown, HardDrive, Sparkles, ArrowRight, Clock,
} from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

const ACTIVITY_MAP = [
  { key: 'resumo',     icon: Sparkles,     color: 'bg-violet-100 text-violet-600' },
  { key: 'resposta',   icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'documento',  icon: FileText,     color: 'bg-blue-100 text-blue-600' },
  { key: 'login',      icon: Flame,        color: 'bg-orange-100 text-orange-600' },
  { key: 'acesso',     icon: Flame,        color: 'bg-orange-100 text-orange-600' },
];

function getActivityStyle(reason) {
  const lower = reason?.toLowerCase() || '';
  const match = ACTIVITY_MAP.find(a => lower.includes(a.key));
  return match || { icon: Star, color: 'bg-amber-100 text-amber-600' };
}

export default function Profile() {
  const { progress, loading } = useRewardsContext();
  const { user } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);

  const { data: allProgress = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserProgress.list('-xp', 50),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const level = getLevelInfo(progress.xp || 0);
  const percent = getXpProgressPercent(progress.xp || 0);
  const nextLevel = LEVELS.find(l => l.level === level.level + 1);
  const xpToNext = nextLevel ? nextLevel.minXP - (progress.xp || 0) : 0;

  const allHistory = [...(progress.xp_history || [])].reverse();
  const visibleActivities = showAllActivities ? allHistory : allHistory.slice(0, 6);

  const ranked = [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const top5 = ranked.slice(0, 5);
  const userRank = ranked.findIndex(p => p.user_email === progress.user_email) + 1;
  const userInTop5 = top5.some(e => e.user_email === progress.user_email);

  const summaryCount = allHistory.filter(h => h.reason?.toLowerCase().includes('resumo')).length;
  const username = user?.email?.split('@')[0] || 'Estudante';

  const starCount = Math.min(Math.ceil(level.level / 2.5), 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Hero Card */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-500 p-6 text-white">
            <div className="flex items-start gap-5">

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl border-2 border-white/30 shadow-xl">
                  {LEVEL_ICONS[level.level - 1] || '🌱'}
                </div>
                <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white text-violet-700 text-xs font-bold flex items-center justify-center shadow-md border-2 border-violet-200">
                  {level.level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
                  {level.name}
                </p>
                <h2 className="text-2xl font-bold text-white mb-3 capitalize">{username}</h2>

                {/* XP bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-violet-200">Nível {level.level}</span>
                    <span className="text-white font-semibold">{(progress.xp || 0).toLocaleString('pt-BR')} XP</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-violet-100">
                  <span className="truncate max-w-[220px]">{user?.email}</span>
                  {progress.streak_days > 0 && (
                    <span className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-full text-xs shrink-0">
                      <Flame className="h-3 w-3 text-orange-300" />
                      {progress.streak_days} dias seguidos
                    </span>
                  )}
                </div>
              </div>

              {/* Rank badge */}
              {userRank > 0 && (
                <div className="hidden sm:flex flex-col items-end gap-3 shrink-0">
                  {nextLevel && (
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Próximo nível</p>
                      <p className="text-white font-semibold text-sm">{xpToNext} XP</p>
                    </div>
                  )}
                  <div className="bg-white/20 px-4 py-2 rounded-xl text-center min-w-[60px]">
                    <p className="text-white/70 text-xs">Ranking</p>
                    <p className="text-white font-bold text-xl leading-tight">#{userRank}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-border bg-card">
            <div className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{documents.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDFs enviados</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{summaryCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resumos gerados</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{subjects.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Matérias</p>
            </div>
          </div>
        </Card>

        {/* Recent Activities */}
        {allHistory.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Atividades Recentes
              </h3>
              {allHistory.length > 6 && (
                <button
                  onClick={() => setShowAllActivities(v => !v)}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 transition-colors"
                >
                  {showAllActivities ? 'Ver menos' : 'Ver Todos'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {visibleActivities.map((entry, i) => {
                const { icon: Icon, color } = getActivityStyle(entry.reason);
                return (
                  <div
                    key={`${i}-${entry.date}`}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.reason}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {entry.date}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg shrink-0 border border-emerald-100">
                      +{entry.amount} XP
                    </span>
                  </div>
                );
              })}
            </div>

            {showAllActivities && allHistory.length > 6 && (
              <button
                onClick={() => setShowAllActivities(false)}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Recolher
              </button>
            )}
          </Card>
        )}

        {/* Full Leaderboard */}
        {ranked.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking Semanal
              </h3>
              {userRank > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Você está em #{userRank}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {top5.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_email === progress.user_email;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isMe
                        ? 'bg-violet-50 border border-violet-200/80'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      medal ? '' :
                      isMe ? 'bg-violet-100 text-violet-700' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {medal || rank}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(entry.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-violet-700' : 'text-foreground'}`}>
                        {entry.user_email?.split('@')[0] || 'Estudante'}
                        {isMe && <span className="ml-1.5 text-xs text-violet-400">(você)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-sm font-bold ${isMe ? 'text-violet-600' : 'text-foreground'}`}>
                        {(entry.xp || 0).toLocaleString('pt-BR')} XP
                      </span>
                      {isMe && <TrendingUp className="h-3.5 w-3.5 text-violet-400" />}
                    </div>
                  </div>
                );
              })}

              {!userInTop5 && userRank > 0 && (
                <>
                  <div className="text-center py-1 text-xs text-muted-foreground select-none">• • •</div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200/80">
                    <div className="h-9 w-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      {userRank}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(progress.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-violet-700 truncate">
                        {progress.user_email?.split('@')[0]}
                        <span className="ml-1.5 text-xs text-violet-400">(você)</span>
                      </p>
                    </div>
                    <span className="text-sm font-bold text-violet-600 shrink-0">
                      {(progress.xp || 0).toLocaleString('pt-BR')} XP
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <Link to="/leaderboard">
                <Button variant="outline" className="w-full gap-2 text-sm">
                  Ver Ranking Completo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* ── RIGHT SIDEBAR (1/3) ───────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Level Progress Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Nível {level.level}</h3>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map(s => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= starCount
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-muted text-muted-foreground/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center mb-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
              {LEVEL_ICONS[level.level - 1] || '🌱'}
            </div>
            <p className="font-bold text-lg text-foreground">{level.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(progress.xp || 0).toLocaleString('pt-BR')} / {nextLevel?.minXP?.toLocaleString('pt-BR') || '∞'} XP
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(percent)}% concluído</span>
              {nextLevel && <span>faltam {xpToNext.toLocaleString('pt-BR')} XP</span>}
            </div>
          </div>
        </Card>

        {/* Como Ganhar XP */}
        <Card className="p-6">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-500" />
            Como Ganhar XP
          </h3>
          <div className="space-y-3">
            {[
              { icon: CheckCircle2, label: 'Resposta correta',  xp: XP_REWARDS.CORRECT_ANSWER,    color: 'text-emerald-600 bg-emerald-100' },
              { icon: Sparkles,     label: 'Resumo gerado',     xp: XP_REWARDS.SUMMARY_GENERATED, color: 'text-violet-600 bg-violet-100'  },
              { icon: FileText,     label: 'Documento enviado', xp: XP_REWARDS.DOCUMENT_UPLOADED, color: 'text-blue-600 bg-blue-100'       },
              { icon: Flame,        label: 'Login diário',      xp: XP_REWARDS.DAILY_LOGIN,       color: 'text-orange-600 bg-orange-100'  },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm flex-1 text-foreground">{item.label}</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                  +{item.xp} XP
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Mini Ranking */}
        {top5.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Rank Semanal
              </h3>
              {userRank > 0 && (
                <Badge variant="outline" className="text-xs">#{userRank}</Badge>
              )}
            </div>

            <div className="space-y-1.5">
              {top5.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_email === progress.user_email;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                      isMe ? 'bg-violet-50' : 'hover:bg-secondary/50'
                    }`}
                  >
                    <span className="text-sm w-5 text-center shrink-0">
                      {medal || <span className="text-xs text-muted-foreground font-medium">{rank}</span>}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(entry.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <p className={`text-xs flex-1 truncate font-medium ${isMe ? 'text-violet-700' : 'text-foreground'}`}>
                      {entry.user_email?.split('@')[0]}
                    </p>
                    <span className={`text-xs font-bold whitespace-nowrap ${isMe ? 'text-violet-600' : 'text-foreground'}`}>
                      {(entry.xp || 0).toLocaleString('pt-BR')} XP
                    </span>
                  </div>
                );
              })}
            </div>

            <Link to="/leaderboard" className="block mt-4">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1 text-muted-foreground hover:text-foreground">
                Ver Rank Completo <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </Card>
        )}

        {/* Subscription Card */}
        <Card className="p-6">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-violet-500" />
            Minha Assinatura
          </h3>

          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-semibold text-foreground">Plano Atual: Básico</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              Grátis
            </Badge>
          </div>

          <div className="space-y-4 mb-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> PDFs enviados
                </span>
                <span className="font-semibold text-foreground">{documents.length} / 25</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-400 rounded-full transition-all"
                  style={{ width: `${Math.min((documents.length / 25) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Resumos gerados
                </span>
                <span className="font-semibold text-foreground">{summaryCount}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Matérias
                </span>
                <span className="font-semibold text-foreground">{subjects.length} / 10</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all"
                  style={{ width: `${Math.min((subjects.length / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <Button className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm shadow-sm">
            <Crown className="h-4 w-4" /> Ver Planos
          </Button>

          <button className="w-full mt-3 text-xs text-red-400 hover:text-red-600 transition-colors py-1 flex items-center justify-center gap-1">
            Excluir Conta
          </button>
        </Card>

      </div>
    </div>
  );
}
