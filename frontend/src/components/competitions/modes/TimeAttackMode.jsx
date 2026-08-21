import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Loader2 } from 'lucide-react';
import CompetitionQuestion from './CompetitionQuestion';
import { format } from 'date-fns';

export default function TimeAttackMode({ competition, user, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [pool, setPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(competition.time_limit_seconds || 300);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const queryClient = useQueryClient();

  useEffect(() => {
    loadQuestions();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!loading && !finished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); finishGame(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [loading, finished]);

  const loadQuestions = async () => {
    const filter = competition.subject_id ? { subject_id: competition.subject_id } : {};
    let qs = await base44.entities.Question.filter(filter, '-created_date', 100);
    qs = qs.sort(() => Math.random() - 0.5);
    setPool(qs);
    setQuestions(qs.slice(0, 1));
    setLoading(false);
  };

  const handleAnswer = (isCorrect) => {
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newWrong = !isCorrect ? wrong + 1 : wrong;
    if (isCorrect) setCorrect(c => c + 1);
    else setWrong(w => w + 1);
    // Load next question from pool
    const nextIdx = currentIndex + 1;
    if (nextIdx < pool.length) {
      setCurrentIndex(nextIdx);
      setQuestions(pool.slice(0, nextIdx + 1));
    }
  };

  const finishGame = async () => {
    if (finished) return;
    setFinished(true);
    clearInterval(timerRef.current);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const c = correct, w = wrong;
    const score = c * 100 - w * 10;

    const updatedParticipants = competition.participants.map(p =>
      p.email === user.email
        ? { ...p, status: 'finished', correct: c, wrong: w, score: Math.max(0, score), time_spent_seconds: timeSpent, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
        : p
    );

    const allFinished = updatedParticipants.every(p => p.status === 'finished');
    await base44.entities.Competition.update(competition.id, {
      participants: updatedParticipants,
      ...(allFinished ? { status: 'finished', finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['competition', competition.id] });
    onFinish();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft <= 30;

  if (loading) return (
    <Card className="p-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Preparando questões...</p>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className={`p-4 flex items-center justify-between ${isUrgent ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200/60'}`}>
        <div className="flex items-center gap-2">
          <Timer className={`h-5 w-5 ${isUrgent ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
          <span className={`font-semibold ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>Contra o Tempo</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-bold">✓ {correct}</span>
          <span className="text-red-600 font-bold">✗ {wrong}</span>
          <span className={`font-mono text-xl font-bold ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </Card>

      {pool.length > 0 && (
        <CompetitionQuestion
          key={currentIndex}
          question={pool[currentIndex]}
          index={currentIndex}
          total={pool.length}
          onAnswer={handleAnswer}
          timePerQuestion={30}
        />
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={finishGame}>Encerrar</Button>
      </div>
    </div>
  );
}