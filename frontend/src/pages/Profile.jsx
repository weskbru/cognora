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
import PageHeader from '@/components/shared/PageHeader';
import XPProgressBar from '@/components/rewards/XPProgressBar';
import StreakBadge from '@/components/rewards/StreakBadge';
import LeaderboardCard from '@/components/leaderboard/LeaderboardCard';
import { Flame, Star, Zap, FileText, CheckCircle2, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];

function MiniLeaderboard({ currentUserEmail }) {
  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserProgress.list('-xp', 50),
  });

  const ranked = [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const top5 = ranked.slice(0, 5);
  const userRank = ranked.findIndex(p => p.user_email === currentUserEmail) + 1;
  const userInTop5 = ranked.slice(0, 5).some(p => p.user_email === currentUserEmail);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Top Estudantes
          {userRank > 0 && (
            <Badge variant="secondary" className="text-xs">Você: #{userRank}</Badge>
          )}
        </h3>
        <Link to="/leaderboard">
          <Button variant="outline" size="sm">Ver Ranking Completo</Button>
        </Link>
      </div>
      <div className="space-y-1">
        {top5.map((entry, i) => (
          <LeaderboardCard
            key={entry.id}
            entry={entry}
            rank={i + 1}
            isCurrentUser={entry.user_email === currentUserEmail}
          />
        ))}
        {/* Show current user if not in top 5 */}
        {!userInTop5 && userRank > 0 && (
          <>
            <div className="text-center py-1 text-xs text-muted-foreground">• • •</div>
            <LeaderboardCard
              entry={ranked[userRank - 1]}
              rank={userRank}
              isCurrentUser
            />
          </>
        )}
      </div>
    </Card>
  );
}

export default function Profile() {
  const { progress, loading } = useRewardsContext();
  const { user } = useAuth();
  const [xpHistoryPage, setXpHistoryPage] = useState(1);
  const itemsPerPage = 10;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const level = getLevelInfo(progress.xp || 0);
  const percent = getXpProgressPercent(progress.xp || 0);
  const nextLevel = LEVELS.find(l => l.level === level.level + 1);
  
  // XP History with pagination
  const allHistory = [...(progress.xp_history || [])].reverse();
  const totalPages = Math.ceil(allHistory.length / itemsPerPage);
  const startIdx = (xpHistoryPage - 1) * itemsPerPage;
  const paginatedHistory = allHistory.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader title="Meu Progresso" description="Acompanhe sua evolução de estudos" />

      {/* Hero Card */}
      <Card className="p-8 bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-8">
          {/* Avatar & Level */}
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl shadow-xl border-4 border-background">
              {LEVEL_ICONS[(level.level - 1)] || '🌱'}
            </div>
            <div className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center border-4 border-background shadow-lg">
              Nv.{level.level}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="space-y-1 mb-4">
              <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest">Seu Progresso</p>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {level.name}
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Usuário</p>
                <p className="text-sm font-semibold text-foreground">
                  {user?.email?.split('@')[0] || 'Estudante'}
                </p>
              </div>
              <div className="h-10 w-px bg-border/30" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Email</p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.email || '—'}
                </p>
              </div>
              <div className="h-10 w-px bg-border/30" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Total XP</p>
                <p className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                  ✨ {progress.xp || 0} XP
                </p>
              </div>
            </div>

            {/* Streak & Progress */}
            <div className="flex items-center gap-3">
              <StreakBadge streak={progress.streak_days} size="md" />
              <div className="h-8 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium flex items-center">
                {Math.round(percent)}% para próximo nível
              </div>
            </div>
          </div>

          {/* Progress Bar (Right side on larger screens) */}
          <div className="sm:w-48">
            <XPProgressBar xp={progress.xp || 0} compact={false} />
          </div>
        </div>
      </Card>

      {/* Levels Roadmap */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Jornada de Níveis</h3>
        <div className="space-y-3">
          {LEVELS.map(l => {
            const isCurrentLevel = l.level === level.level;
            const isUnlocked = (progress.xp || 0) >= l.minXP;
            return (
              <div key={l.level} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                isCurrentLevel ? 'bg-primary/10 border border-primary/30' : isUnlocked ? 'opacity-60' : 'opacity-30'
              }`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  isCurrentLevel ? 'bg-primary/20' : isUnlocked ? 'bg-secondary' : 'bg-muted'
                }`}>
                  {LEVEL_ICONS[l.level - 1]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Nível {l.level} — {l.name}</span>
                    {isCurrentLevel && <Badge className="text-xs bg-primary text-primary-foreground">Atual</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{l.minXP} XP{l.maxXP !== Infinity ? ` – ${l.maxXP} XP` : '+'}</p>
                </div>
                {isUnlocked && !isCurrentLevel && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* XP History */}
      {allHistory.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Histórico de XP</h3>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              {allHistory.length} registros
            </span>
          </div>
          
          <div className="space-y-2">
            {paginatedHistory.map((entry, i) => (
              <div key={`${xpHistoryPage}-${i}`} className="flex items-center justify-between py-2.5 px-3 border border-border/50 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shrink-0 border border-amber-200">
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-600 whitespace-nowrap ml-2">+{entry.amount} XP</span>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setXpHistoryPage(p => Math.max(1, p - 1))}
                disabled={xpHistoryPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {xpHistoryPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setXpHistoryPage(p => Math.min(totalPages, p + 1))}
                disabled={xpHistoryPage === totalPages}
                className="gap-1"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Mini Leaderboard */}
      <MiniLeaderboard currentUserEmail={progress.user_email} />

      {/* How to earn XP */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Como Ganhar XP</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: CheckCircle2, label: 'Resposta correta', xp: XP_REWARDS.CORRECT_ANSWER, color: 'text-emerald-600 bg-emerald-100' },
            { icon: Zap, label: 'Resumo gerado', xp: XP_REWARDS.SUMMARY_GENERATED, color: 'text-primary bg-primary/10' },
            { icon: FileText, label: 'Documento enviado', xp: XP_REWARDS.DOCUMENT_UPLOADED, color: 'text-accent bg-accent/10' },
            { icon: Flame, label: 'Login diário', xp: XP_REWARDS.DAILY_LOGIN, color: 'text-orange-600 bg-orange-100' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm flex-1">{item.label}</span>
              <span className="text-sm font-bold text-amber-600">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}