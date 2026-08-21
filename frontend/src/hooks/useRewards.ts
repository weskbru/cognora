import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProgress } from '@/types/entities';
import type { ProfileUpdate, RewardNotification, RewardPopupState, RewardsContextValue } from '@/types/rewards';
import { useAuth } from '@/lib/AuthContext';

export const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  WRONG_ANSWER: 2,
  SUMMARY_GENERATED: 30,
  DOCUMENT_UPLOADED: 20,
  DAILY_LOGIN: 15,
  STREAK_BONUS: 5, // per streak day, multiplied
};

export interface LevelInfo { level: number; name: string; minXP: number; maxXP: number; }

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Iniciante', minXP: 0, maxXP: 100 },
  { level: 2, name: 'Estudante', minXP: 100, maxXP: 250 },
  { level: 3, name: 'Dedicado', minXP: 250, maxXP: 500 },
  { level: 4, name: 'Aplicado', minXP: 500, maxXP: 900 },
  { level: 5, name: 'Avançado', minXP: 900, maxXP: 1500 },
  { level: 6, name: 'Expert', minXP: 1500, maxXP: 2500 },
  { level: 7, name: 'Mestre', minXP: 2500, maxXP: 4000 },
  { level: 8, name: 'Gênio', minXP: 4000, maxXP: 6000 },
  { level: 9, name: 'Lendário', minXP: 6000, maxXP: 10000 },
  { level: 10, name: 'Supremo', minXP: 10000, maxXP: Infinity },
];

export function getLevelInfo(xp: number): LevelInfo {
  const current = [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
  return current;
}

export function getXpProgressPercent(xp: number): number {
  const level = getLevelInfo(xp);
  if (level.maxXP === Infinity) return 100;
  const range = level.maxXP - level.minXP;
  const progress = xp - level.minXP;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function useRewards(): RewardsContextValue {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [rewardPopup, setRewardPopup] = useState<RewardPopupState | null>(null);
  const [notifications, setNotifications] = useState<RewardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef<UserProgress | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const pushNotification = useCallback((xp: number, reason: string, levelUp = false, newLevel: number | null = null) => {
    const notif = { id: Date.now(), xp, reason, levelUp, newLevel, date: new Date().toISOString() };
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);

  const loadProgress = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      const records = await base44.entities.UserProgress.filter({ user_email: user.email });

      if (records.length === 0) {
        const newRecord = await base44.entities.UserProgress.create({
          user_email: user.email,
          xp: 0,
          level: 1,
          streak_days: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          total_summaries_generated: 0,
          total_documents_uploaded: 0,
          xp_history: [],
        });
        setProgress(newRecord);
        progressRef.current = newRecord;
      } else {
        const record = records[0];
        setProgress(record);
        progressRef.current = record;
      }
    } catch (error) {
      console.error('Não foi possível carregar o progresso:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const addXP = useCallback(async (amount: number, reason: string): Promise<void> => {
    const current = progressRef.current;
    if (!current) return;

    const newXP = (current.xp || 0) + amount;
    const newLevel = getLevelInfo(newXP).level;
    const levelUp = newLevel > (current.level || 1);
    const today = new Date().toISOString().slice(0, 10);

    const updated = await base44.entities.UserProgress.update(current.id, {
      xp: newXP,
      level: newLevel,
      xp_history: [...(current.xp_history || []), { amount, reason, date: today }].slice(-50),
    });

    setProgress(updated);
    progressRef.current = updated;
    queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    setRewardPopup({ xp: amount, reason, levelUp, newLevel: levelUp ? newLevel : null });
    pushNotification(amount, reason, levelUp, levelUp ? newLevel : null);
  }, [queryClient, pushNotification]);

  const addXPForCorrectAnswer = useCallback(() => addXP(XP_REWARDS.CORRECT_ANSWER, '✅ Resposta correta'), [addXP]);
  const addXPForWrongAnswer = useCallback(() => addXP(XP_REWARDS.WRONG_ANSWER, '📚 Questão respondida'), [addXP]);
  const addXPForSummary = useCallback(() => addXP(XP_REWARDS.SUMMARY_GENERATED, '✨ Resumo gerado por IA'), [addXP]);
  const addXPForDocument = useCallback(() => addXP(XP_REWARDS.DOCUMENT_UPLOADED, '📄 Documento enviado'), [addXP]);

  const updateProfile = useCallback(async (fields: ProfileUpdate): Promise<void> => {
    const current = progressRef.current;
    if (!current) return;
    const updated = await base44.entities.UserProgress.update(current.id, fields);
    setProgress(updated);
    progressRef.current = updated;
  }, []);

  return {
    progress,
    loading,
    rewardPopup,
    clearRewardPopup: () => setRewardPopup(null),
    notifications,
    unreadCount,
    clearUnread: () => setUnreadCount(0),
    addXPForCorrectAnswer,
    addXPForWrongAnswer,
    addXPForSummary,
    addXPForDocument,
    updateProfile,
    refreshProgress: loadProgress,
  };
}
