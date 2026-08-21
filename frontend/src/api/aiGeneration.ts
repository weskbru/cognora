import { base44 } from '@/api/base44Client';
import { ApiError } from '@/lib/apiError';
import type { AIGenerationJob } from '@/types/entities';

const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_TIME_MS = 4 * 60_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

export async function waitForAIGenerationJob(initialJob: AIGenerationJob): Promise<AIGenerationJob> {
  let job = initialJob;
  const deadline = Date.now() + MAX_POLL_TIME_MS;

  while (job.status === 'queued' || job.status === 'processing') {
    if (Date.now() >= deadline) {
      throw new ApiError(
        504,
        'A geração continua em segundo plano. Volte a este documento em alguns instantes.',
        'AI_JOB_POLL_TIMEOUT',
      );
    }
    await delay(POLL_INTERVAL_MS);
    job = await base44.aiGeneration.get(job.id);
  }

  if (job.status === 'failed') {
    throw new ApiError(
      503,
      job.error_message || 'Não foi possível concluir a geração. Tente novamente.',
      job.error_code || 'AI_GENERATION_FAILED',
    );
  }

  return job;
}
