import { useState, type ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { waitForAIGenerationJob } from '@/api/aiGeneration';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import LimitReachedCard from '@/components/freemium/LimitReachedCard';
import AILoadingCard from '@/components/shared/AILoadingCard';
import { useRewardsContext } from '@/context/RewardsContext';
import { getErrorMessage } from '@/lib/apiError';
import type { Document, Summary } from '@/types/entities';

interface SummarySectionProps {
  document: Document;
  summaries: Summary[];
  documentId: string;
}

function apiStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

function apiCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return null;
}

export default function SummarySection({ document, summaries, documentId }: SummarySectionProps): ReactElement {
  const [generating, setGenerating] = useState(false);
  const [limitCode, setLimitCode] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { addXPForSummary } = useRewardsContext();
  const { toast } = useToast();

  const refreshGeneratedData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['summaries', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
      queryClient.invalidateQueries({ queryKey: ['summaries'] }),
      queryClient.invalidateQueries({ queryKey: ['limits-status'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const handleGenerateSummary = async (): Promise<void> => {
    setGenerating(true);
    setLimitCode(null);
    try {
      const job = await base44.aiGeneration.start({
        document_id: documentId,
        operation: 'summary',
      });

      if (job.subscription_status === 'expired') {
        toast({
          title: 'Assinatura expirada',
          description: 'Sua conta agora está usando os limites do plano Free.',
        });
      }

      await waitForAIGenerationJob(job);
      await addXPForSummary();
      await refreshGeneratedData();
      toast({ title: 'Resumo concluído!', description: 'O conteúdo foi salvo no documento.' });
    } catch (error) {
      const status = apiStatus(error);
      if (status === 403 || status === 429) {
        setLimitCode(apiCode(error) || 'AI_CREDITS_INSUFFICIENT');
      } else {
        toast({
          title: 'Não foi possível gerar o resumo',
          description: getErrorMessage(error, 'Tente novamente em alguns instantes.'),
          variant: 'destructive',
        });
      }
      await refreshGeneratedData();
    } finally {
      setGenerating(false);
    }
  };

  const summary = summaries[0];

  if (generating) {
    return (
      <AILoadingCard
        title="Gerando resumo com IA..."
        subtitle="Você pode sair desta página; o processamento continuará em segundo plano."
      />
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
          <Sparkles className="h-4 w-4" />
          {document.status === 'processing' ? 'Acompanhar geração' : 'Gerar Resumo com IA'}
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
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-h3:mt-3 prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-strong:font-semibold prose-hr:border-border prose-ul:my-1 prose-li:my-0">
          <ReactMarkdown>{summary.content || ''}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}
