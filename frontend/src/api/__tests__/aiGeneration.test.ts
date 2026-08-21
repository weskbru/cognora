import { afterEach, describe, expect, it, vi } from 'vitest';

import { waitForAIGenerationJob } from '../aiGeneration';
import { base44 } from '../base44Client';
import type { AIGenerationJob } from '@/types/entities';

vi.mock('../base44Client', () => ({
  base44: {
    aiGeneration: {
      get: vi.fn(),
    },
  },
}));

const queuedJob: AIGenerationJob = {
  id: 'job-1',
  document_id: 'document-1',
  operation: 'summary',
  status: 'queued',
  result: {},
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('waitForAIGenerationJob', () => {
  it('acompanha o job ate o backend confirmar a persistencia', async () => {
    vi.useFakeTimers();
    const completedJob: AIGenerationJob = {
      ...queuedJob,
      status: 'completed',
      result: { created_count: 1 },
    };
    vi.mocked(base44.aiGeneration.get).mockResolvedValue(completedJob);

    const resultPromise = waitForAIGenerationJob(queuedJob);
    await vi.advanceTimersByTimeAsync(1_500);

    await expect(resultPromise).resolves.toEqual(completedJob);
    expect(base44.aiGeneration.get).toHaveBeenCalledWith('job-1');
  });

  it('repassa a mensagem segura registrada pelo backend', async () => {
    await expect(waitForAIGenerationJob({
      ...queuedJob,
      status: 'failed',
      error_code: 'AI_GENERATION_TIMEOUT',
      error_message: 'Seu uso foi estornado; tente novamente.',
    })).rejects.toMatchObject({
      status: 503,
      code: 'AI_GENERATION_TIMEOUT',
      message: 'Seu uso foi estornado; tente novamente.',
    });
  });
});
