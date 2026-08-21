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
});
