import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Swords, ArrowLeft } from 'lucide-react';
import CompetitionQuestion from './CompetitionQuestion';
import { format } from 'date-fns';

export default function DuelMode({ competition, user, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [startTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    const filter = competition.subject_id ? { subject_id: competition.subject_id } : {};
    let qs = await base44.entities.Question.filter(filter, '-created_date', 50);
    qs = qs.sort(() => Math.random() - 0.5).slice(0, competition.question_count || 5);
    setQuestions(qs);
    setLoading(false);
    if (competition.host_email === user.email && (!competition.questions || competition.questions.length === 0)) {
      await base44.entities.Competition.update(competition.id, { questions: qs.map(q => q.id) });
    }
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
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const score = Math.max(0, fc * 100 - fw * 10);
    const updatedParticipants = competition.participants.map(p =>
      p.email === user.email
        ? { ...p, status: 'finished', correct: fc, wrong: fw, score, time_spent_seconds: timeSpent, finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
        : p
    );
    const humansDone = updatedParticipants.filter(p => p.email !== 'bot@studyai.app').every(p => p.status === 'finished');
    const winner = humansDone ? [...updatedParticipants].filter(p => p.status === 'finished').sort((a, b) => b.score - a.score)[0]?.email : undefined;
    await base44.entities.Competition.update(competition.id, {
      participants: updatedParticipants,
      ...(humansDone ? { winner_email: winner } : {}),
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* HUD */}
      <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-red-600" />
            <span className="font-bold text-red-700">Duelo Rápido</span>
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
      </Card>

      <CompetitionQuestion key={currentIndex} question={questions[currentIndex]} index={currentIndex} total={questions.length} onAnswer={handleAnswer} />
    </div>
  );
}