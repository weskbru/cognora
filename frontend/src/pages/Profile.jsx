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
  X, Check, Camera,
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];
const AVATAR_OPTIONS = ['🧑‍🎓', '👩‍🎓', '🦊', '🐼', '🦁', '🐯', '🦄', '🐉', '🤖', '👾', '🧙', '🦸'];

const ACTIVITY_MAP = [
  { key: 'resumo',    icon: Sparkles,     color: 'bg-primary/10 text-primary' },
  { key: 'resposta',  icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'documento', icon: FileText,     color: 'bg-blue-100 text-blue-600' },
  { key: 'login',     icon: Flame,        color: 'bg-orange-100 text-orange-600' },
  { key: 'acesso',    icon: Flame,        color: 'bg-orange-100 text-orange-600' },
];

function getActivityStyle(reason) {
  const lower = reason?.toLowerCase() || '';
  const match = ACTIVITY_MAP.find(a => lower.includes(a.key));
  return match || { icon: Star, color: 'bg-amber-100 text-amber-600' };
}

// Build last 35 days activity from xp_history
function buildActivityGrid(xpHistory) {
  const activeDates = new Set(
    (xpHistory || []).map(h => h.date).filter(Boolean)
  );
  const today = new Date();
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const date = subDays(today, i);
    const key = format(date, 'yyyy-MM-dd');
    days.push({ date, key, active: activeDates.has(key), isToday: i === 0 });
  }
  return days;
}

// Streak milestones (Duolingo-style)
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export default function Profile() {
  const { progress, loading, updateProfile } = useRewardsContext();
  const { user } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleOpenEdit = () => {
    setEditName(progress?.display_name || user?.email?.split('@')[0] || '');
    setEditAvatar(progress?.avatar_emoji || LEVEL_ICONS[getLevelInfo(progress?.xp || 0).level - 1] || '🌱');
    setEditAvatarUrl(progress?.avatar_url || '');
    setEditOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditAvatarUrl(file_url);
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    await updateProfile({
      display_name: editName.trim(),
      avatar_emoji: editAvatarUrl ? '' : editAvatar,
      avatar_url: editAvatarUrl,
    });
    setSaving(false);
    setEditOpen(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
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

  const displayName = progress.display_name || user?.email?.split('@')[0] || 'Estudante';
  const avatarEmoji = progress.avatar_emoji || LEVEL_ICONS[level.level - 1] || '🌱';
  const starCount = Math.min(Math.ceil(level.level / 2.5), 4);
  const streak = progress.streak_days || 0;

  const activityGrid = buildActivityGrid(progress.xp_history);
  const nextMilestone = STREAK_MILESTONES.find(m => m > streak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const milestonePercent = Math.min(100, Math.round((streak / nextMilestone) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Editar Perfil</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Photo upload */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Foto de perfil</p>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden bg-secondary flex items-center justify-center shrink-0 border border-border">
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">{editAvatar}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-sm text-primary cursor-pointer hover:bg-primary/5 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Camera className="h-4 w-4" />
                    {uploadingPhoto ? 'Enviando...' : 'Enviar foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {editAvatarUrl && (
                    <button
                      onClick={() => setEditAvatarUrl('')}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Emoji avatar picker — only when no photo */}
            {!editAvatarUrl && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Ou escolha um avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      className={`h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        editAvatar === emoji
                          ? 'bg-primary/15 ring-2 ring-primary scale-110'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">Nome de exibição</p>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={30}
                placeholder="Como quer ser chamado?"
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{editName.length}/30</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-1.5" onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                <Check className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Hero Card */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-white relative">
            <div className="flex items-start gap-5">
              {/* Avatar — click to edit */}
              <div className="relative shrink-0 group cursor-pointer" onClick={handleOpenEdit}>
                <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl border-2 border-white/30 shadow-xl overflow-hidden">
                  {progress.avatar_url ? (
                    <img src={progress.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    avatarEmoji
                  )}
                </div>
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center shadow-md border-2 border-white/20">
                  {level.level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">
                  {level.name}
                </p>
                <h2 className="text-2xl font-bold text-white mb-3 capitalize">{displayName}</h2>

                {/* XP bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/70">Nível {level.level}</span>
                    <span className="text-white font-semibold">{(progress.xp || 0).toLocaleString('pt-BR')} XP</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                  <span className="truncate max-w-[200px] text-xs">{user?.email}</span>
                  {streak > 0 && (
                    <span className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-full text-xs shrink-0">
                      <Flame className="h-3 w-3 text-orange-300" />
                      {streak} dias seguidos
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
                      <p className="text-white font-semibold text-sm">{xpToNext.toLocaleString('pt-BR')} XP</p>
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
        </Card>

        {/* Streak Calendar */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Sequência de Atividade
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-orange-500">{streak}</span>
              <span className="text-xs text-muted-foreground leading-tight">dias<br/>seguidos</span>
            </div>
          </div>

          {/* 35-day grid */}
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <p key={i} className="text-center text-[10px] text-muted-foreground font-medium">{d}</p>
            ))}
            {activityGrid.map(({ key, active, isToday }) => (
              <div
                key={key}
                title={format(parseISO(key), "d 'de' MMMM", { locale: ptBR })}
                className={`h-8 w-full rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                  isToday
                    ? active
                      ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-1'
                      : 'ring-2 ring-primary/40 ring-offset-1 bg-secondary text-muted-foreground'
                    : active
                    ? 'bg-orange-400 text-white'
                    : 'bg-secondary text-muted-foreground/40'
                }`}
              >
                {active ? '🔥' : ''}
              </div>
            ))}
          </div>

          {/* Progress to next milestone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Próxima conquista: <span className="font-semibold text-orange-500">{nextMilestone} dias 🏅</span></span>
              <span>{streak}/{nextMilestone}</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${milestonePercent}%` }}
              />
            </div>
          </div>

          {/* Milestone badges */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {STREAK_MILESTONES.map(m => {
              const unlocked = streak >= m;
              return (
                <div
                  key={m}
                  title={`${m} dias seguidos`}
                  className={`flex flex-col items-center px-2.5 py-2 rounded-xl border transition-all ${
                    unlocked
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-secondary border-border text-muted-foreground/40'
                  }`}
                >
                  <span className="text-lg">{unlocked ? '🏅' : '🔒'}</span>
                  <span className="text-[10px] font-semibold mt-0.5">{m}d</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Activities */}
        {allHistory.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Atividades Recentes
              </h3>
              {allHistory.length > 6 && (
                <button
                  onClick={() => setShowAllActivities(v => !v)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
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
                  <div key={`${i}-${entry.date}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-secondary/50 transition-colors">
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
              <button onClick={() => setShowAllActivities(false)} className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                Recolher
              </button>
            )}
          </Card>
        )}

        {/* Ranking preview */}
        {ranked.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking
              </h3>
              {userRank > 0 && <Badge variant="secondary" className="text-xs">Você: #{userRank}</Badge>}
            </div>

            <div className="space-y-2">
              {top5.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_email === progress.user_email;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                return (
                  <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isMe ? 'bg-primary/8 border border-primary/20' : 'hover:bg-secondary/50'}`}>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${!medal && (isMe ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}`}>
                      {medal || rank}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(entry.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                        {entry.display_name || entry.user_email?.split('@')[0]}
                        {isMe && <span className="ml-1.5 text-xs opacity-60">(você)</span>}
                      </p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${isMe ? 'text-primary' : 'text-foreground'}`}>
                      {(entry.xp || 0).toLocaleString('pt-BR')} XP
                    </span>
                  </div>
                );
              })}

              {!userInTop5 && userRank > 0 && (
                <>
                  <div className="text-center py-1 text-xs text-muted-foreground select-none">• • •</div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/8 border border-primary/20">
                    <div className="h-9 w-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">{userRank}</div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(progress.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {displayName}<span className="ml-1.5 text-xs opacity-60">(você)</span>
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">{(progress.xp || 0).toLocaleString('pt-BR')} XP</span>
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

      {/* ── RIGHT SIDEBAR ──────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Level Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Nível {level.level}</h3>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map(s => (
                <Star key={s} className={`h-4 w-4 ${s <= starCount ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/20'}`} />
              ))}
            </div>
          </div>

          <div className="text-center mb-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-3xl mx-auto mb-3 shadow-md overflow-hidden">
              {progress.avatar_url ? (
                <img src={progress.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                avatarEmoji
              )}
            </div>
            <p className="font-bold text-lg text-foreground">{level.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(progress.xp || 0).toLocaleString('pt-BR')} / {nextLevel?.minXP?.toLocaleString('pt-BR') || '∞'} XP
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(percent)}% concluído</span>
              {nextLevel && <span>faltam {xpToNext.toLocaleString('pt-BR')} XP</span>}
            </div>
          </div>

          <button
            onClick={handleOpenEdit}
            className="mt-4 w-full text-xs text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1.5 transition-colors py-1.5 border border-primary/20 rounded-lg hover:bg-primary/5"
          >
            <Camera className="h-3 w-3" /> Editar perfil
          </button>
        </Card>

        {/* Como Ganhar XP */}
        <Card className="p-6">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Como Ganhar XP
          </h3>
          <div className="space-y-3">
            {[
              { icon: CheckCircle2, label: 'Resposta correta',  xp: XP_REWARDS.CORRECT_ANSWER,    color: 'text-emerald-600 bg-emerald-100' },
              { icon: Sparkles,     label: 'Resumo gerado',     xp: XP_REWARDS.SUMMARY_GENERATED, color: 'text-primary bg-primary/10'      },
              { icon: FileText,     label: 'Documento enviado', xp: XP_REWARDS.DOCUMENT_UPLOADED, color: 'text-blue-600 bg-blue-100'        },
              { icon: Flame,        label: 'Login diário',      xp: XP_REWARDS.DAILY_LOGIN,       color: 'text-orange-600 bg-orange-100'   },
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
                Rank
              </h3>
              {userRank > 0 && <Badge variant="outline" className="text-xs">#{userRank}</Badge>}
            </div>
            <div className="space-y-1.5">
              {top5.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_email === progress.user_email;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                return (
                  <div key={entry.id} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${isMe ? 'bg-primary/8' : 'hover:bg-secondary/50'}`}>
                    <span className="text-sm w-5 text-center shrink-0">{medal || <span className="text-xs text-muted-foreground font-medium">{rank}</span>}</span>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(entry.user_email?.[0] || '?').toUpperCase()}
                    </div>
                    <p className={`text-xs flex-1 truncate font-medium ${isMe ? 'text-primary' : 'text-foreground'}`}>
                      {entry.display_name || entry.user_email?.split('@')[0]}
                    </p>
                    <span className={`text-xs font-bold whitespace-nowrap ${isMe ? 'text-primary' : 'text-foreground'}`}>
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

        {/* Assinatura */}
        <Card className="p-6">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Minha Assinatura
          </h3>

          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-semibold text-foreground">Plano Atual: Básico</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Grátis</Badge>
          </div>

          <div className="space-y-4 mb-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3 w-3" /> PDFs enviados</span>
                <span className="font-semibold text-foreground">{documents.length} / 25</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.min((documents.length / 25) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="h-3 w-3" /> Matérias</span>
                <span className="font-semibold text-foreground">{subjects.length} / 10</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${Math.min((subjects.length / 10) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          <Button className="w-full gap-2 text-sm shadow-sm">
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
