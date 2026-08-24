import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, base44 } from '../base44Client';

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('base44Client', () => {
  it('inclui filtros, ordenacao e limite na consulta de entidades', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await base44.entities.Question.filter({ subject_id: 'subject-1' }, '-created_date', 10);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/questions?subject_id=subject-1&sort=-created_date&limit=10'),
      expect.objectContaining({ method: 'GET', credentials: 'include', headers: {} }),
    );
  });

  it('nao envia content-type em GET e evita preflight desnecessario', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('GET', '/api/auth/me');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ headers: {} }),
    );
  });

  it('protege mutacoes do navegador com cabecalho csrf', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('POST', '/api/subjects', { name: 'Biologia' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/subjects'),
      expect.objectContaining({
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Cognora-CSRF': '1' },
      }),
    );
  });

  it('lanca Error tipado para respostas de falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: { code: 'SUBJECT_REQUIRED', message: 'Selecione uma matéria.' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(apiRequest('POST', '/api/documents', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'SUBJECT_REQUIRED',
      message: 'Selecione uma matéria.',
    });
  });

  it('inicia geracao assincrona com resposta imediata do backend', async () => {
    const job = {
      id: 'job-1',
      document_id: 'document-1',
      operation: 'summary',
      status: 'queued',
      result: {},
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(job), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(base44.aiGeneration.start({
      document_id: 'document-1',
      operation: 'summary',
    })).resolves.toEqual(job);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/nlp/jobs'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ document_id: 'document-1', operation: 'summary' }),
      }),
    );
  });

  it('envia os parâmetros para gerar uma trilha de estudos', async () => {
    const path = {
      id: 'path-1',
      objective: 'Passar no concurso da Polícia Civil',
      weeks_count: 4,
      hours_per_week: 10,
      status: 'queued',
      weeks: [],
      completed_milestones: [],
      created_at: '2026-08-24T12:00:00Z',
      updated_at: '2026-08-24T12:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(path), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(base44.studyPaths.create({
      objective: path.objective,
      target_date: null,
      weeks_count: 4,
      hours_per_week: 10,
    })).resolves.toEqual(path);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/study-paths'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          objective: path.objective,
          target_date: null,
          weeks_count: 4,
          hours_per_week: 10,
        }),
      }),
    );
  });
});
