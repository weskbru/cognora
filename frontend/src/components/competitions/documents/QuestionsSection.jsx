import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import AILoadingCard from '@/components/shared/AILoadingCard';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuestionCard from './QuestionCard';
import EmptyState from '@/components/competitions/shared/EmptyState';
import LimitReachedCard from '@/components/freemium/LimitReachedCard';

export default function QuestionsSection({ document, questions, documentId, subjectId }) {
  const [generating, setGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState('5');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [limitCode, setLimitCode] = useState(null);
  const queryClient = useQueryClient();

  const handleGenerateQuestions = async () => {
    setGenerating(true);
    setCurrentIndex(0);
    setLimitCode(null);
    try {
      const result = await base44.integrations.Core.AnalisarDocumento({
        file_url: document.file_url,
      });

      if (result.perguntas?.length > 0) {
        await base44.entities.Question.bulkCreate(
          result.perguntas.map(q => ({
            statement: q.statement,
            type: q.type,
            alternatives: q.alternatives,
            explanation: q.explanation,
            difficulty: q.difficulty,
            document_id: documentId,
            subject_id: subjectId,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['questions', documentId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['limits-status'] });
    } catch (err) {
      if (err?.status === 429 || err?.status === 403) {
        setLimitCode(err.message?.code || 'GENERATION_LIMIT_REACHED');
      } else {
        console.error('Erro ao gerar questões:', err);
      }
    } finally {
      setGenerating(false);
    }
  };

  const goTo = (index) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  if (generating) {
    return (
      <AILoadingCard
        title="Gerando questões com IA..."
        subtitle={`Criando ${questionCount} questões de múltipla escolha`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Select value={questionCount} onValueChange={setQuestionCount}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 questões</SelectItem>
              <SelectItem value="5">5 questões</SelectItem>
              <SelectItem value="10">10 questões</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={handleGenerateQuestions} disabled={!document.file_url}>
            <Sparkles className="h-4 w-4" /> Gerar Questões
          </Button>
        </div>
        {questions.length > 0 && (
          <p className="text-sm text-muted-foreground">{questions.length} questão(ões) geradas</p>
        )}
      </div>

      {limitCode && (
        <LimitReachedCard code={limitCode} onDismiss={() => setLimitCode(null)} />
      )}

      {questions.length === 0 && !limitCode ? (
        <EmptyState
          icon={HelpCircle}
          title="Nenhuma questão gerada"
          description="Gere questões automaticamente a partir do conteúdo do documento"
          actionLabel="Ver Documentos"
          actionPath="/documents"
        />
      ) : questions.length > 0 ? (

        <div className="space-y-4">
          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Questão <span className="text-primary">{currentIndex + 1}</span> de {questions.length}
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {Math.round(((currentIndex) / questions.length) * 100)}% concluído
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Bolinhas de navegação rápida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'bg-primary scale-125'
                    : 'bg-secondary hover:bg-primary/40'
                }`}
              />
            ))}
          </div>

          {/* Questão atual */}
          <QuestionCard
            key={questions[currentIndex].id}
            question={questions[currentIndex]}
            index={currentIndex}
            onAnswer={() => {}}
          />

          {/* Navegação Anterior / Próxima */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={e => { e.preventDefault(); goTo(currentIndex - 1); }}
                  className={currentIndex === 0 ? 'pointer-events-none opacity-50' : ''}
                  aria-disabled={currentIndex === 0}
                />
              </PaginationItem>

              <PaginationItem>
                <span className="text-sm text-muted-foreground px-3 tabular-nums">
                  {currentIndex + 1} / {questions.length}
                </span>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={e => { e.preventDefault(); goTo(currentIndex + 1); }}
                  className={currentIndex === questions.length - 1 ? 'pointer-events-none opacity-50' : ''}
                  aria-disabled={currentIndex === questions.length - 1}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}
