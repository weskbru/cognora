import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  WRONG_ANSWER: 2,
  SUMMARY_GENERATED: 30,
  DOCUMENT_UPLOADED: 20,
  DAILY_LOGIN: 15,
  STREAK_BONUS: 5, // per streak day, multiplied
};

export const LEVELS = [
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

export function getLevelInfo(xp) {
  const current = [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
  return current;
}

export function getXpProgressPercent(xp) {
  const level = getLevelInfo(xp);
  if (level.maxXP === Infinity) return 100;
  const range = level.maxXP - level.minXP;
  const progress = xp - level.minXP;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function useRewards() {
  const [progress, setProgress] = useState(null);
  const [rewardPopup, setRewardPopup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef(null);
  const queryClient = useQueryClient();

  const pushNotification = useCallback((xp, reason, levelUp = false, newLevel = null) => {
    const notif = { id: Date.now(), xp, reason, levelUp, newLevel, date: new Date().toISOString() };
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);

  const loadProgress = useCallback(async () => {
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      setLoading(false);
      return; // backend indisponivel, nao trava a UI
    }
    const records = await base44.entities.UserProgress.filter({ user_email: user.email });
    const today = format(new Date(), 'yyyy-MM-dd');

    if (records.length === 0) {
      // Create new progress record
      const newRecord = await base44.entities.UserProgress.create({
        user_email: user.email,
        xp: XP_REWARDS.DAILY_LOGIN,
        level: 1,
        streak_days: 1,
        last_active_date: today,
        total_questions_answered: 0,
        total_correct_answers: 0,
        total_summaries_generated: 0,
        total_documents_uploaded: 0,
        xp_history: [{ amount: XP_REWARDS.DAILY_LOGIN, reason: 'Primeiro acesso!', date: today }],
      });
      setProgress(newRecord);
      progressRef.current = newRecord;
      setRewardPopup({ xp: XP_REWARDS.DAILY_LOGIN, reason: '🎉 Bem-vindo! Primeiro acesso', levelUp: false });
      pushNotification(XP_REWARDS.DAILY_LOGIN, '🎉 Bem-vindo! Primeiro acesso');
    } else {
      let record = records[0];
      // Check daily login
      if (record.last_active_date !== today) {
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        const newStreak = record.last_active_date === yesterday ? (record.streak_days || 0) + 1 : 1;
        const streakBonus = newStreak > 1 ? XP_REWARDS.STREAK_BONUS * Math.min(newStreak, 7) : 0;
        const totalXP = XP_REWARDS.DAILY_LOGIN + streakBonus;
        const newXP = (record.xp || 0) + totalXP;
        const newLevel = getLevelInfo(newXP).level;
        const levelUp = newLevel > (record.level || 1);

        const updated = await base44.entities.UserProgress.update(record.id, {
          xp: newXP,
          level: newLevel,
          streak_days: newStreak,
          last_active_date: today,
          xp_history: [...(record.xp_history || []), {
            amount: totalXP,
            reason: newStreak > 1 ? `Login diário + Streak ${newStreak} dias 🔥` : 'Login diário',
            date: today,
          }].slice(-50),
        });
        setProgress(updated);
        progressRef.current = updated;
        const reason = newStreak > 1
          ? `Login diário + 🔥 Streak de ${newStreak} dias (+${streakBonus} bônus)`
          : 'Login diário';
        setRewardPopup({ xp: totalXP, reason, levelUp, newLevel: levelUp ? newLevel : null });
        pushNotification(totalXP, reason, levelUp, levelUp ? newLevel : null);
      } else {
        setProgress(record);
        progressRef.current = record;
      }
    }
    setLoading(false);
  }, [pushNotification]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const addXP = useCallback(async (amount, reason) => {
    const current = progressRef.current;
    if (!current) return;

    const newXP = (current.xp || 0) + amount;
    const newLevel = getLevelInfo(newXP).level;
    const levelUp = newLevel > (current.level || 1);
    const today = format(new Date(), 'yyyy-MM-dd');

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
  };
}