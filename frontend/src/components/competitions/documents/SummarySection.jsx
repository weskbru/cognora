import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRewardsContext } from '@/context/RewardsContext';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import EmptyState from '@/components/shared/EmptyState';
import LimitReachedCard from '@/components/freemium/LimitReachedCard';

export default function SummarySection({ document, summaries, documentId }) {
  const [generating, setGenerating] = useState(false);
  const [limitCode, setLimitCode] = useState(null);
  const queryClient = useQueryClient();
  const { addXPForSummary } = useRewardsContext();

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setLimitCode(null);
    try {
      await base44.entities.Document.update(documentId, { status: 'processing' });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });

      const result = await base44.integrations.Core.AnalisarDocumento({
        file_url: document.file_url,
      });

      await base44.entities.Summary.create({
        content: result.resumo,
        document_id: documentId,
        subject_id: document.subject_id,
      });

      await base44.entities.Document.update(documentId, { status: 'completed' });
      addXPForSummary();

      queryClient.invalidateQueries({ queryKey: ['summaries', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      queryClient.invalidateQueries({ queryKey: ['limits-status'] });
    } catch (err) {
      const code = err?.message?.code || (typeof err?.message === 'object' ? err.message?.code : null)
        || (err?.status === 429 ? 'GENERATION_LIMIT_REACHED' : null);
      if (err?.status === 429 || err?.status === 403) {
        const detail = err.message;
        setLimitCode(detail?.code || 'GENERATION_LIMIT_REACHED');
        await base44.entities.Document.update(documentId, { status: 'pending' }).catch(() => {});
      } else {
        await base44.entities.Document.update(documentId, { status: 'error' }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    } finally {
      setGenerating(false);
    }
  };

  const summary = summaries[0];

  if (generating) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h3 className="font-semibold text-lg">Gerando resumo com IA...</h3>
        <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
      </Card>
    );
  }

  if (limitCode) {
    return <LimitReachedCard code={limitCode} onDismiss={() => setLimitCode(null)} />;
  }

  if (!summary) {
    return (
      <Card className="p-8 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Gerar Resumo</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Use IA para gerar um resumo detalhado do conteúdo deste documento
        </p>
        <Button className="mt-6 gap-2" onClick={handleGenerateSummary} disabled={!document.file_url}>
          <Sparkles className="h-4 w-4" /> Gerar Resumo com IA
        </Button>
        {!document.file_url && (
          <p className="text-xs text-destructive mt-2">Nenhum arquivo PDF encontrado</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Resumo do Documento</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerateSummary}>
          <Sparkles className="h-3.5 w-3.5" /> Regerar
        </Button>
      </div>
      <Card className="p-6">
        <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80">
          <ReactMarkdown>{summary.content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}