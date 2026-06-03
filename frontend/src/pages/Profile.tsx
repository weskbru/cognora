// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { subscriptionsApi } from '@/api/subscriptions';
import { useAuth } from '@/lib/AuthContext';
import { useRewardsContext } from '@/context/RewardsContext';
import { getLevelInfo, getXpProgressPercent, LEVELS, XP_REWARDS } from '@/hooks/useRewards';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, CalendarDays, Camera, Check, CheckCircle2, Crown, FileText,
  Flame, Gift, Lock, Mail, Pencil, Sparkles, Trophy, X, Zap,
} from 'lucide-react';

const LEVEL_ICONS = ['🌱', '📖', '💡', '🎯', '🚀', '⚡', '🏆', '🧠', '🌟', '👑'];
const AVATAR_OPTIONS = ['🧑‍🎓', '👩‍🎓', '🦊', '🐼', '🦁', '🐯', '🦄', '🐉', '🤖', '👾', '🧙', '🦸'];
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type PlanId = 'free' | 'pro' | 'unlimited';

interface PlanCardConfig {
  title: string;
  badge: string;
  docsMax: number | null;
  subjectsMax: number | null;
  badgeClassName: string;
}

const PLAN_CARD_CONFIG: Record<PlanId, PlanCardConfig> = {
  free: {
    title: 'Básico',
    badge: 'Grátis',
    docsMax: 1,
    subjectsMax: 2,
    badgeClassName: '',
  },
  pro: {
    title: 'Pro',
    badge: 'Ativo',
    docsMax: null,
    subjectsMax: null,
    badgeClassName: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  unlimited: {
    title: 'Ilimitado',
    badge: 'Ativo',
    docsMax: null,
    subjectsMax: null,
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  },
};

const ACTIVITY_MAP = [
  { key: 'resumo', icon: Sparkles, color: 'bg-primary/10 text-primary' },
  { key: 'resposta', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
  { key: 'documento', icon: FileText, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' },
  { key: 'login', icon: Flame, color: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400' },
  { key: 'acesso', icon: Flame, color: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400' },
];

function getActivityStyle(reason) {
  const lower = reason?.toLowerCase() || '';
  return ACTIVITY_MAP.find(activity => lower.includes(activity.key)) || {
    icon: Zap,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  };
}

function getInitials(entry) {
  const value = entry?.display_name || entry?.user_email?.split('@')[0] || '?';
  return value.slice(0, 2).toUpperCase();
}

function getWeekActivity(xpHistory) {
  const activeDates = new Set((xpHistory || []).map(entry => entry.date).filter(Boolean));
  return Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const key = format(date, 'yyyy-MM-dd');
    return { key, active: activeDates.has(key), today: index === 6 };
  });
}

export default function Profile() {
  const { progress, loading, updateProfile } = useRewardsContext();
  const { user } = useAuth();
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
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionsApi.getStatus(),
  });

  const handleOpenEdit = () => {
    setEditName(progress?.display_name || user?.email?.split('@')[0] || '');
    setEditAvatar(progress?.avatar_emoji || LEVEL_ICONS[getLevelInfo(progress?.xp || 0).level - 1] || '🌱');
    setEditAvatarUrl(progress?.avatar_url || '');
    setEditOpen(true);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditAvatarUrl(file_url);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
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
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-64 rounded-2xl xl:col-span-9" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-3" />
        <Skeleton className="h-36 rounded-2xl xl:col-span-9" />
      </div>
    );
  }

  if (!progress) return null;

  const xp = progress.xp || 0;
  const level = getLevelInfo(xp);
  const percent = getXpProgressPercent(xp);
  const nextLevel = LEVELS.find(item => item.level === level.level + 1);
  const xpToNext = nextLevel ? Math.max(0, nextLevel.minXP - xp) : 0;
  const ranked = [...allProgress].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const top5 = ranked.slice(0, 5);
  const top3 = ranked.slice(0, 3);
  const userRank = ranked.findIndex(item => item.user_email === progress.user_email) + 1;
  const displayName = progress.display_name || user?.email?.split('@')[0] || 'Estudante';
  const avatarEmoji = progress.avatar_emoji || LEVEL_ICONS[level.level - 1] || '🌱';
  const streak = progress.streak_days || 0;
  const activities = [...(progress.xp_history || [])].reverse().slice(0, 3);
  const weekActivity = getWeekActivity(progress.xp_history);

  return (
    <div className="-m-4 min-h-[calc(100vh-70px)] bg-background p-4 text-foreground md:-m-8 md:p-8">
      {editOpen && (
        <EditProfileModal
          avatar={editAvatar}
          avatarUrl={editAvatarUrl}
          editName={editName}
          onAvatarChange={setEditAvatar}
          onAvatarUrlChange={setEditAvatarUrl}
          onClose={() => setEditOpen(false)}
          onNameChange={setEditName}
          onPhotoUpload={handlePhotoUpload}
          onSave={handleSaveEdit}
          saving={saving}
          uploadingPhoto={uploadingPhoto}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-xl font-black">👋 Fala, {displayName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue evoluindo e chegue ao topo.</p>
        </header>

        <div className="grid gap-5 xl:grid-cols-12">
          <HeroCard
            avatarEmoji={avatarEmoji}
            displayName={displayName}
            level={level}
            onEdit={handleOpenEdit}
            percent={percent}
            progress={progress}
            rank={userRank}
            user={user}
            xp={xp}
            xpToNext={xpToNext}
          />
          <WeeklyLeague entries={top5} progress={progress} />
          <StreakCard streak={streak} weekActivity={weekActivity} />
          <RecentActivities entries={activities} />
          <XpRules />
          <RankingPreview entries={top3} progress={progress} rank={userRank} />
          <PlanCard documents={documents} subjects={subjects} subscriptionStatus={subscriptionStatus} />
        </div>
      </div>
    </div>
  );
}

function HeroCard({ avatarEmoji, level, onEdit, percent, progress, rank, user, xp, xpToNext }) {
  const levelLimit = level.maxXP ?? xp;
  return (
    <Card className="relative overflow-hidden border-ring/40 bg-gradient-to-br from-slate-950 via-slate-950 to-ring/50 p-6 text-white shadow-lg shadow-ring/20 xl:col-span-9">
      <div className="absolute -right-12 top-4 text-8xl opacity-20">🪐</div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <button onClick={onEdit} className="group relative mx-auto shrink-0 md:mx-0" title="Editar perfil">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-ring/70 bg-ring/50 text-6xl shadow-lg shadow-ring/30">
            {progress.avatar_url ? <img src={progress.avatar_url} alt="avatar" className="h-full w-full object-cover" /> : avatarEmoji}
          </div>
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-ring/60 bg-slate-950 text-white transition-colors group-hover:bg-ring/70">
            <Pencil className="h-3.5 w-3.5" />
          </span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-b-xl bg-ring px-3 py-1 text-center text-[10px] font-black uppercase tracking-wide">
            Nível <strong className="block text-xl leading-5">{level.level}</strong>
          </span>
        </button>

        <div className="min-w-0 flex-1 pt-6 md:pt-0">
          <h2 className="text-2xl font-black">{avatarEmoji} {level.name}</h2>
          <p className="mt-3 text-sm text-white/75">Nível {level.level}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-ring" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-bold">{xp.toLocaleString('pt-BR')} / {levelLimit === Infinity ? '∞' : levelLimit.toLocaleString('pt-BR')} XP</span>
          </div>
          <p className="mt-2 text-sm text-white/75">{nextLevelText(xpToNext)}</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 px-5 py-4 text-center">
          <p className="text-xs text-white/75">Ranking Geral</p>
          <p className="mt-1 text-2xl font-black">#{rank || '-'}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-4 text-xs text-white/75">
        <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {user?.email}</span>
        <span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Continue estudando todos os dias</span>
        <span className="flex items-center gap-2 text-amber-300"><Zap className="h-3.5 w-3.5" /> Seu foco te aproxima do topo.</span>
      </div>
    </Card>
  );
}

function nextLevelText(xpToNext) {
  return xpToNext > 0 ? `Próximo nível: faltam ${xpToNext.toLocaleString('pt-BR')} XP` : 'Você chegou ao nível máximo.';
}

function WeeklyLeague({ entries, progress }) {
  return (
    <Card className="p-5 xl:col-span-3 xl:row-span-2">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-base font-black"><Trophy className="h-5 w-5 text-amber-500" /> Liga Semanal</h2>
        <p className="mt-1 text-xs text-muted-foreground">Dispute XP e alcance o pódio.</p>
      </div>
      <div className="space-y-2">
        {entries.length > 0 ? entries.map((entry, index) => (
          <LeagueRow key={entry.id || entry.user_email} entry={entry} isMe={entry.user_email === progress.user_email} rank={index + 1} />
        )) : <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">O ranking começa com o próximo estudante.</p>}
      </div>
      <Link to="/leaderboard" className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10">
        Ver ranking completo <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

function LeagueRow({ entry, isMe, rank }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isMe ? 'bg-primary/15 ring-1 ring-primary/30' : 'bg-secondary/70'}`}>
      <span className="w-5 text-center text-sm font-black">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ring text-[10px] font-black text-white">{getInitials(entry)}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold">{entry.display_name || entry.user_email?.split('@')[0]}{isMe ? ' (você)' : ''}</span>
      <span className="whitespace-nowrap text-xs font-black">{(entry.xp || 0).toLocaleString('pt-BR')} XP</span>
    </div>
  );
}

function StreakCard({ streak, weekActivity }) {
  const rewardDays = streak < 7 ? 7 : Math.ceil((streak + 1) / 7) * 7;
  return (
    <Card className="p-5 xl:col-span-9">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black"><Flame className="h-5 w-5 text-orange-500" /> Sequência de Atividade</h2>
              <p className="mt-1 text-xs text-muted-foreground">Estude todos os dias e mantenha sua sequência!</p>
            </div>
            <p className="text-right text-2xl font-black text-orange-500">{streak} <span className="text-sm text-foreground">dias</span></p>
          </div>
          <div className="mt-4 grid max-w-xl grid-cols-7 gap-3">
            {weekActivity.map((day, index) => (
              <div key={day.key} className="text-center">
                <p className="mb-1 text-[10px] text-muted-foreground">{WEEK_DAYS[index]}</p>
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs ${day.active ? 'border-orange-500 bg-orange-500/15 text-orange-500' : 'border-border bg-secondary text-muted-foreground'}`}>
                  {day.active ? <Check className="h-4 w-4" /> : <Lock className="h-3 w-3 opacity-60" />}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-48 items-center gap-3 rounded-xl bg-primary/10 p-4">
          <Gift className="h-10 w-10 text-orange-500" />
          <div><p className="text-xs text-muted-foreground">Próxima recompensa</p><p className="mt-1 text-sm font-black">{rewardDays} dias</p></div>
        </div>
      </div>
    </Card>
  );
}

function RecentActivities({ entries }) {
  return (
    <Card className="p-5 xl:col-span-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-black"><Sparkles className="h-4 w-4 text-primary" /> Atividades Recentes</h2>
      <div className="space-y-2">
        {entries.length > 0 ? entries.map((entry, index) => {
          const { icon: Icon, color } = getActivityStyle(entry.reason);
          return (
            <div key={`${entry.date}-${index}`} className="flex items-center gap-3 rounded-xl bg-secondary/70 px-3 py-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{entry.reason}</p><p className="text-[11px] text-muted-foreground">{entry.date}</p></div>
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">+{entry.amount} XP</span>
            </div>
          );
        }) : <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">Suas próximas atividades aparecerão aqui.</p>}
      </div>
    </Card>
  );
}

function XpRules() {
  const rules = [
    { icon: CheckCircle2, label: 'Resposta correta', xp: XP_REWARDS.CORRECT_ANSWER, color: 'text-emerald-500' },
    { icon: Sparkles, label: 'Resumo gerado', xp: XP_REWARDS.SUMMARY_GENERATED, color: 'text-primary' },
    { icon: FileText, label: 'Documento enviado', xp: XP_REWARDS.DOCUMENT_UPLOADED, color: 'text-blue-500' },
    { icon: Flame, label: 'Login diário', xp: XP_REWARDS.DAILY_LOGIN, color: 'text-orange-500' },
  ];
  return (
    <Card className="p-5 xl:col-span-3">
      <h2 className="mb-4 flex items-center gap-2 text-base font-black"><Zap className="h-4 w-4 text-primary" /> Como Ganhar XP</h2>
      <div className="space-y-3">
        {rules.map(({ icon: Icon, label, xp, color }) => (
          <div key={label} className="flex items-center gap-3 text-xs"><Icon className={`h-4 w-4 ${color}`} /><span className="flex-1 font-semibold">{label}</span><Badge variant="secondary">+{xp} XP</Badge></div>
        ))}
      </div>
    </Card>
  );
}

function RankingPreview({ entries, progress, rank }) {
  return (
    <Card className="p-5 xl:col-span-7">
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black"><Trophy className="h-4 w-4 text-amber-500" /> Seu Ranking</h2>{rank > 0 && <Badge variant="secondary">Sua posição: #{rank}</Badge>}</div>
      <div className="space-y-2">
        {entries.length > 0 ? entries.map((entry, index) => <LeagueRow key={entry.id || entry.user_email} entry={entry} isMe={entry.user_email === progress.user_email} rank={index + 1} />) : <p className="text-sm text-muted-foreground">Continue estudando para inaugurar o ranking.</p>}
      </div>
      <Link to="/leaderboard" className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:text-primary/80">Ver ranking completo <ArrowRight className="h-3.5 w-3.5" /></Link>
    </Card>
  );
}

function PlanCard({ documents, subjects, subscriptionStatus }) {
  const currentPlan = subscriptionStatus?.plan || 'free';
  const normalizedPlan = PLAN_CARD_CONFIG[currentPlan] ? currentPlan : 'free';
  const planConfig = PLAN_CARD_CONFIG[normalizedPlan];
  const expiresAt = subscriptionStatus?.plan_expires_at
    ? new Date(subscriptionStatus.plan_expires_at).toLocaleDateString('pt-BR')
    : null;

  const usageWidth = (value, max) => {
    if (max === null) return value > 0 ? 100 : 0;
    return Math.min(100, (value / max) * 100);
  };

  const usageLimit = (max) => (max === null ? 'Ilimitado' : max);

  return (
    <Card className="p-5 xl:col-span-5">
      <h2 className="flex items-center gap-2 text-base font-black"><Crown className="h-4 w-4 text-primary" /> Plano Atual</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-lg font-black">
        {planConfig.title}
        <Badge variant="outline" className={planConfig.badgeClassName}>{planConfig.badge}</Badge>
      </div>
      {expiresAt && normalizedPlan !== 'free' && (
        <p className="mt-1 text-xs text-muted-foreground">Ativo ate {expiresAt}</p>
      )}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>PDFs enviados</span><span>{documents.length} / {usageLimit(planConfig.docsMax)}</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${usageWidth(documents.length, planConfig.docsMax)}%` }} /></div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Matérias</span><span>{subjects.length} / {usageLimit(planConfig.subjectsMax)}</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${usageWidth(subjects.length, planConfig.subjectsMax)}%` }} /></div>
      </div>
      <Link to="/pricing"><Button className="mt-5 w-full gap-2"><Crown className="h-4 w-4" /> Ver planos e benefícios</Button></Link>
    </Card>
  );

  return (
    <Card className="p-5 xl:col-span-5">
      <h2 className="flex items-center gap-2 text-base font-black"><Crown className="h-4 w-4 text-primary" /> Plano Atual</h2>
      <div className="mt-4 flex items-center gap-2 text-lg font-black">Básico <Badge variant="outline">Grátis</Badge></div>
      <Usage label="PDFs enviados" value={documents.length} max={25} />
      <Usage label="Matérias" value={subjects.length} max={10} />
      <Link to="/pricing"><Button className="mt-5 w-full gap-2"><Crown className="h-4 w-4" /> Ver planos e benefícios</Button></Link>
    </Card>
  );
}

function Usage({ label, value, max }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{value} / {max}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
    </div>
  );
}

function EditProfileModal({ avatar, avatarUrl, editName, onAvatarChange, onAvatarUrlChange, onClose, onNameChange, onPhotoUpload, onSave, saving, uploadingPhoto }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm space-y-5 p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Editar Perfil</h3><button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button></div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-3xl">{avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : avatar}</div>
          <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-sm text-primary ${uploadingPhoto ? 'pointer-events-none opacity-50' : ''}`}><Camera className="h-4 w-4" /> {uploadingPhoto ? 'Enviando...' : 'Enviar foto'}<input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} /></label>
        </div>
        {avatarUrl ? <button onClick={() => onAvatarUrlChange('')} className="text-xs text-red-500">Remover foto</button> : (
          <div className="grid grid-cols-6 gap-2">{AVATAR_OPTIONS.map(emoji => <button key={emoji} onClick={() => onAvatarChange(emoji)} className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${avatar === emoji ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary'}`}>{emoji}</button>)}</div>
        )}
        <input value={editName} onChange={event => onNameChange(event.target.value)} maxLength={30} placeholder="Como quer ser chamado?" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
        <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" disabled={saving || !editName.trim()} onClick={onSave}>{saving ? 'Salvando...' : 'Salvar'}</Button></div>
      </Card>
    </div>
  );
}
