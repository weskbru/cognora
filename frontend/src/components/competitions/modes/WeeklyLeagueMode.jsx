import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Target } from 'lucide-react';
import CompetitionQuestion from './CompetitionQuestion';
import { format, parseISO, isAfter } from 'date-fns';

export default function WeeklyLeagueMode({ competition, user, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  // Week ends?
  const weekEnded = competition.week_end && isAfter(new Date(), parseISO(competition.week_end + 'T23:59:59'));

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    const filter = competition.subject_id ? { subject_id: competition.subject_id } : {};
    let qs = await base44.entities.Question.filter(filter, '-created_date', 100);
    qs = qs.sort(() => Math.random() - 0.5).slice(0, 20);
    setQuestions(qs);
    setLoading(false);
  };

  const handleAnswer = async (isCorrect) => {
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newWrong = !isCorrect ? wrong + 1 : wrong;
    if (isCorrect) setCorrect(c => c + 1);
    else setWrong(w => w + 1);
    setSessionAnswered(s => s + 1);

    if (currentIndex + 1 >= questions.length) {
      await saveProgress(newCorrect, newWrong);
      setDone(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const saveProgress = async (finalCorrect, finalWrong) => {
    // Accumulate on top of existing
    const myParticipant = competition.participants?.find(p => p.email === user.email);
    const accCorrect = (myParticipant?.correct || 0) + finalCorrect;
    const accWrong = (myParticipant?.wrong || 0) + finalWrong;
    const accScore = accCorrect * 100 - accWrong * 10;

    const updatedParticipants = competition.participants.map(p =>
      p.email === user.email
        ? { ...p, correct: accCorrect, wrong: accWrong, score: Math.max(0, accScore), finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') }
        : p
    );

    const shouldFinish = weekEnded;
    await base44.entities.Competition.update(competition.id, {
      participants: updatedParticipants,
      ...(shouldFinish ? { status: 'finished', finished_at: format(new Date(), 'yyyy-MM-dd HH:mm') } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['competition', competition.id] });
  };

  if (loading) return (
    <Card className="p-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Preparando questões...</p>
    </Card>
  );

  if (done) return (
    <Card className="p-10 text-center space-y-4">
      <div className="text-5xl">🏆</div>
      <h3 className="text-xl font-bold">Sessão concluída!</h3>
      <p className="text-muted-foreground">Você respondeu {sessionAnswered} questões nesta sessão.</p>
      <div className="flex justify-center gap-6">
        <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{correct}</p><p className="text-xs text-muted-foreground">Acertos</p></div>
        <div className="text-center"><p className="text-2xl font-bold text-red-500">{wrong}</p><p className="text-xs text-muted-foreground">Erros</p></div>
      </div>
      <p className="text-sm text-muted-foreground">Volte amanhã para acumular mais pontos na liga!</p>
      <Button onClick={onFinish}>Ver Ranking da Liga</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/60">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-700">Liga Semanal</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-bold">✓ {correct}</span>
          <span className="text-red-600 font-bold">✗ {wrong}</span>
          <span className="text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />{sessionAnswered} esta sessão</span>
        </div>
      </Card>

      {competition.week_end && (
        <p className="text-xs text-center text-muted-foreground">
          Liga encerra em: <span className="font-medium">{competition.week_end}</span>
        </p>
      )}

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      <CompetitionQuestion
        key={currentIndex}
        question={questions[currentIndex]}
        index={currentIndex}
        total={questions.length}
        onAnswer={handleAnswer}
      />

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => { saveProgress(correct, wrong); onFinish(); }}>
          Salvar e Sair
        </Button>
      </div>
    </div>
  );
}