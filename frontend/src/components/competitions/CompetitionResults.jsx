import React from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Clock, Target, Zap } from 'lucide-react';

const medals = ['🥇', '🥈', '🥉'];

export default function CompetitionResults({ competition, userEmail, live = false }) {
  const sorted = [...(competition.participants || [])]
    .filter(p => p.status === 'finished')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.time_spent_seconds || 999) - (b.time_spent_seconds || 999);
    });

  const allParticipants = competition.participants || [];
  const winner = sorted[0];
  const isWinner = winner?.email === userEmail;
  const myResult = sorted.find(p => p.email === userEmail);
  const myRank = sorted.findIndex(p => p.email === userEmail) + 1;

  if (sorted.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      {/* Banner */}
      <div className={`p-6 text-center ${live ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50'}`}>
        {live ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-sm font-semibold text-blue-700">Placar ao vivo</p>
            </div>
            <p className="text-xs text-muted-foreground">{sorted.length} de {allParticipants.length} finalizado(s)</p>
          </>
        ) : (
          <>
            {isWinner ? (
              <>
                <p className="text-5xl mb-2">🏆</p>
                <p className="text-xl font-bold text-amber-700">Você venceu!</p>
                <p className="text-sm text-amber-600 mt-1">{myResult?.score} pontos · {myResult?.correct} acertos</p>
              </>
            ) : myRank > 0 ? (
              <>
                <p className="text-4xl mb-2">{medals[myRank - 1] || `#${myRank}`}</p>
                <p className="text-lg font-bold text-foreground">Você ficou em {myRank}º lugar</p>
                <p className="text-sm text-muted-foreground mt-1">{myResult?.score} pontos · {myResult?.correct} acertos</p>
              </>
            ) : (
              <>
                <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                <p className="text-lg font-bold">Resultado Final</p>
              </>
            )}
          </>
        )}
      </div>

      {/* Rankings */}
      <div className="p-4 space-y-2">
        {sorted.map((p, i) => (
          <div key={p.email} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            p.email === userEmail
              ? 'bg-primary/10 border border-primary/20'
              : i === 0 && !live
              ? 'bg-amber-50 border border-amber-200/60'
              : 'bg-secondary/50'
          }`}>
            <span className="text-xl w-8 text-center shrink-0">{i < 3 ? medals[i] : `#${i + 1}`}</span>
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {p.email === 'bot@studyai.app' ? '🤖' : (p.display_name || p.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {p.display_name || p.email.split('@')[0]}
                {p.email === userEmail && <span className="ml-1.5 text-xs text-primary">(você)</span>}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5 text-emerald-600"><Target className="h-3 w-3" />{p.correct} acertos</span>
                <span className="text-red-500">{p.wrong} erros</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{Math.floor((p.time_spent_seconds || 0) / 60)}m{(p.time_spent_seconds || 0) % 60}s</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-amber-600 text-base">{p.score}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        ))}

        {/* Players still playing */}
        {allParticipants.filter(p => p.status !== 'finished').map(p => (
          <div key={p.email} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 opacity-60">
            <span className="w-8 text-center text-xs text-muted-foreground">—</span>
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {p.email === 'bot@studyai.app' ? '🤖' : (p.display_name || p.email)[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{p.display_name || p.email.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">Jogando...</p>
            </div>
            <Zap className="h-4 w-4 text-muted-foreground animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}