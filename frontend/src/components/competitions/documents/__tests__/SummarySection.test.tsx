import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { waitForAIGenerationJob } from '@/api/aiGeneration';
import { base44 } from '@/api/base44Client';
import { ApiError } from '@/lib/apiError';
import type { AIGenerationJob, Document } from '@/types/entities';
import SummarySection from '../SummarySection';

const toast = vi.fn();
const addXPForSummary = vi.fn().mockResolvedValue(undefined);
const invalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('@/api/base44Client', () => ({
  base44: { aiGeneration: { start: vi.fn() } },
}));

vi.mock('@/api/aiGeneration', () => ({
  waitForAIGenerationJob: vi.fn(),
}));

vi.mock('@/context/RewardsContext', () => ({
  useRewardsContext: () => ({ addXPForSummary }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

const document: Document = {
  id: 'document-1',
  name: 'Direito Constitucional',
  file_url: '/uploads/documento.pdf',
  subject_id: 'subject-1',
  status: 'pending',
};

const queuedJob: AIGenerationJob = {
  id: 'job-1',
  document_id: document.id,
  operation: 'summary',
  status: 'queued',
  result: {},
};

afterEach(() => {
  vi.clearAllMocks();
  addXPForSummary.mockResolvedValue(undefined);
  invalidateQueries.mockResolvedValue(undefined);
});

describe('SummarySection', () => {
  it('inicia o job, acompanha a conclusao e atualiza os dados', async () => {
    vi.mocked(base44.aiGeneration.start).mockResolvedValue(queuedJob);
    vi.mocked(waitForAIGenerationJob).mockResolvedValue({
      ...queuedJob,
      status: 'completed',
      result: { created_count: 1 },
    });

    render(<SummarySection document={document} summaries={[]} documentId={document.id} />);
    await userEvent.click(screen.getByRole('button', { name: 'Gerar Resumo com IA' }));

    await waitFor(() => expect(base44.aiGeneration.start).toHaveBeenCalledWith({
      document_id: document.id,
      operation: 'summary',
    }));
    expect(waitForAIGenerationJob).toHaveBeenCalledWith(queuedJob);
    expect(addXPForSummary).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Resumo concluído!' }));
  });

  it('mostra ao usuario a mensagem segura devolvida pelo job', async () => {
    vi.mocked(base44.aiGeneration.start).mockResolvedValue(queuedJob);
    vi.mocked(waitForAIGenerationJob).mockRejectedValue(new ApiError(
      503,
      'O serviço de IA está temporariamente indisponível. Seu uso foi estornado.',
      'AI_GENERATION_FAILED',
    ));

    render(<SummarySection document={document} summaries={[]} documentId={document.id} />);
    await userEvent.click(screen.getByRole('button', { name: 'Gerar Resumo com IA' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Não foi possível gerar o resumo',
      description: 'O serviço de IA está temporariamente indisponível. Seu uso foi estornado.',
      variant: 'destructive',
    })));
    expect(addXPForSummary).not.toHaveBeenCalled();
  });
});
