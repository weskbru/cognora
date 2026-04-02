import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Swords } from 'lucide-react';
import CompetitionQuestion from './CompetitionQuestion';
import { format } from 'date-fns';

const BOT_EMAIL = 'bot@studyai.app';

export default function DuelMode({ competition, user, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [startTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [opponent, setOpponent] = useState(null);
  const pollingRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadQuestions();
    startPolling();
    return () => clearInterval(pollingRef.current);
  }, []);

  const loadQuestions = () => {
    const qs = competition.questions_data || [];
    setQuestions(qs);
    setLoading(false);
  };

  const startPolling = () => {
    pollingRef.current = setInterval(async () => {
      const results = await base44.entities.Competition.filter({ id: competition.id });
      const comp = results[0];
      if (!comp) return;
      const opp = comp.participants?.find(p => p.email !== user.email);
      if (opp) setOpponent(opp);
    }, 2000);
  };

  const handleAnswer = async (isCorrect) => {
    const nc = isCorrect ? correct + 1 : correct;
    const nw = !isCorrect ? wrong + 1 : wrong;
    if (isCorrect) setCorrect(c => c + 1); else setWrong(w => w + 1);
    if (currentIndex + 1 >= questions.length) {
      await finishGame(nc, nw);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const finishGame = async (fc, fw) => {
    clearInterval(pollingRef.current);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const score = Math.max(0, fc * 100 - fw * 10);

    const latest = await base44.entities.Competition.filter({ id: competition.id });
    const comp = latest[0];
    if (!comp) { onFinish(); return; }

    const updatedParticipants = comp.participants.map(p =>
      p.email === user.email
        ? { ...p, status: 'finished', correct: fc, wrong: fw, score, time_spent_seconds: timeSpent, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
        : p
    );

    const hasBot = updatedParticipants.some(p => p.email === BOT_EMAIL);
    let finalParticipants = updatedParticipants;

    if (hasBot && updatedParticipants.find(p => p.email === BOT_EMAIL)?.status !== 'finished') {
      const qCount = comp.question_count || 5;
      const botCorrect = Math.floor(Math.random() * (qCount + 1));
      const botWrong = qCount - botCorrect;
      finalParticipants = updatedParticipants.map(p =>
        p.email === BOT_EMAIL
          ? { ...p, status: 'finished', correct: botCorrect, wrong: botWrong, score: Math.max(0, botCorrect * 100 - botWrong * 10), time_spent_seconds: Math.floor(Math.random() * 120) + 30, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
          : p
      );
    }

    const allFinished = finalParticipants.every(p => p.status === 'finished');
    const winner = allFinished ? [...finalParticipants].sort((a, b) => b.score - a.score)[0]?.email : undefined;

    await base44.entities.Competition.update(comp.id, {
      participants: finalParticipants,
      ...(allFinished ? { status: 'finished', winner_email: winner, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') } : {}),
    });

    queryClient.invalidateQueries({ queryKey: ['competition', competition.id] });
    onFinish();
  };

  if (loading) return (
    <Card className="p-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Preparando questões...</p>
    </Card>
  );

  if (questions.length === 0) return (
    <Card className="p-10 text-center space-y-3">
      <p className="text-muted-foreground">Nenhuma questão disponível. Gere questões primeiro nos documentos.</p>
      <Button onClick={onFinish}>Voltar</Button>
    </Card>
  );

  const progress = (currentIndex / questions.length) * 100;
  const myScore = Math.max(0, correct * 100 - wrong * 10);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* HUD */}
      <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200/60 dark:from-red-950/20 dark:to-orange-950/20 dark:border-red-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-red-600" />
            <span className="font-bold text-red-700 dark:text-red-400">Duelo Rápido</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <span className="text-emerald-600">✓ {correct}</span>
            <span className="text-red-500">✗ {wrong}</span>
            <span className="text-muted-foreground font-mono">{currentIndex + 1}/{questions.length}</span>
          </div>
        </div>
        <div className="mt-3 h-2 bg-red-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>

        {/* Placar ao vivo */}
        {opponent && (
          <div className="mt-3 pt-3 border-t border-red-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {opponent.email === BOT_EMAIL ? '🤖' : (opponent.display_name || opponent.email)[0].toUpperCase()}
              </div>
              <span className="text-muted-foreground">{opponent.display_name || opponent.email.split('@')[0]}</span>
              {opponent.status === 'finished' && <span className="text-emerald-600 font-semibold">Terminou!</span>}
            </div>
            <div className="flex items-center gap-3 font-semibold">
              <span className="text-amber-600">{opponent.score ?? 0} pts</span>
              <span className="text-muted-foreground">vs</span>
              <span className="text-primary">{myScore} pts</span>
            </div>
          </div>
        )}
      </Card>

      <CompetitionQuestion key={currentIndex} question={questions[currentIndex]} index={currentIndex} total={questions.length} onAnswer={handleAnswer} />
    </div>
  );
}
