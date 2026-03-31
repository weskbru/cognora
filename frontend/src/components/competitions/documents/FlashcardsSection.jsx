import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, RotateCcw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import AILoadingCard from '@/components/shared/AILoadingCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import LimitReachedCard from '@/components/freemium/LimitReachedCard';

export default function FlashcardsSection({ document, flashcards, documentId }) {
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [limitCode, setLimitCode] = useState(null);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    setCurrentIndex(0);
    setFlipped(false);
    setLimitCode(null);
    try {
      const result = await base44.integrations.Core.AnalisarDocumento({
        file_url: document.file_url,
      });

      if (result.flashcards?.length > 0) {
        await base44.entities.Flashcard.bulkCreate(
          result.flashcards.map(f => ({
            front: f.front,
            back: f.back,
            document_id: documentId,
            subject_id: document.subject_id,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['flashcards', documentId] });
      queryClient.invalidateQueries({ queryKey: ['limits-status'] });
    } catch (err) {
      if (err?.status === 429 || err?.status === 403) {
        setLimitCode(err.message?.code || 'GENERATION_LIMIT_REACHED');
      } else {
        console.error('Erro ao gerar flashcards:', err);
      }
    } finally {
      setGenerating(false);
    }
  };

  const goTo = (i) => {
    if (i >= 0 && i < flashcards.length) {
      setCurrentIndex(i);
      setFlipped(false);
    }
  };

  if (generating) {
    return (
      <AILoadingCard
        title="Gerando flashcards com IA..."
        subtitle="Extraindo conceitos-chave do documento"
      />
    );
  }

  if (limitCode) {
    return <LimitReachedCard code={limitCode} onDismiss={() => setLimitCode(null)} />;
  }

  if (flashcards.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Gerar Flashcards</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Crie flashcards automaticamente para memorizar os conceitos principais do documento
        </p>
        <Button className="mt-6 gap-2" onClick={handleGenerate} disabled={!document.file_url}>
          <Sparkles className="h-4 w-4" /> Gerar Flashcards com IA
        </Button>
      </Card>
    );
  }

  const card = flashcards[currentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate}>
          <Sparkles className="h-3.5 w-3.5" /> Regerar
        </Button>
      </div>

      <div className="cursor-pointer select-none" onClick={() => setFlipped(!flipped)}>
        <Card className={`p-10 min-h-52 flex flex-col items-center justify-center text-center transition-colors duration-200 ${
          flipped ? 'bg-primary/5 border-primary/30' : 'hover:border-primary/20'
        }`}>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {flipped ? 'Resposta' : 'Pergunta'}
          </span>
          <p className="text-lg font-medium text-foreground leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
          {!flipped && (
            <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
              Clique para revelar a resposta
            </p>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {flashcards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
              i === currentIndex ? 'bg-primary scale-125' : 'bg-secondary hover:bg-primary/40'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" className="gap-2" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{currentIndex + 1} / {flashcards.length}</span>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setCurrentIndex(0); setFlipped(false); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </Button>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === flashcards.length - 1}>
          Próximo <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
