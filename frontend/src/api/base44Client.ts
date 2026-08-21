import { ApiError } from '@/lib/apiError';
import { getToken, removeToken } from '@/lib/tokenStorage';
import type { Competition, Document, Flashcard, GenerationStatus, Question, QuestionAttempt, StudySession, Subject, SubjectProgress, Summary, User, UserProgress } from '@/types/entities';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error('[Cognora] VITE_API_URL não configurada. Crie um arquivo .env.local com VITE_API_URL=http://localhost:8001');

type EntityFilters = Record<string, string | number | boolean | null | undefined>;
type ErrorPayload = { detail?: string | { message?: string; code?: string } };

interface EntityClient<TEntity> {
  list(sort?: string | null, limit?: number | null): Promise<TEntity[]>;
  filter(filters: EntityFilters, sort?: string | null, limit?: number | null): Promise<TEntity[]>;
  get(id: string): Promise<TEntity>;
  create(data: Partial<TEntity> | Record<string, unknown>): Promise<TEntity>;
  update(id: string, data: Partial<TEntity> | Record<string, unknown>): Promise<TEntity>;
  delete(id: string): Promise<null>;
  bulkCreate(items: Array<Partial<TEntity> | Record<string, unknown>>): Promise<TEntity[]>;
}

function queryString(filters: EntityFilters = {}, sort?: string | null, limit?: number | null): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  if (sort) params.set('sort', sort);
  if (limit !== undefined && limit !== null) params.set('limit', String(limit));
  const value = params.toString();
  return value ? `?${value}` : '';
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  return response.json().catch(() => ({ detail: response.statusText }));
}

export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await responsePayload(response);
  if (!response.ok) {
    throw ApiError.fromResponse(response.status, (data && typeof data === 'object' ? data : {}) as ErrorPayload, 'Erro na requisição');
  }
  return data as T;
}

function createEntity<TEntity>(entityName: string): EntityClient<TEntity> {
  const base = `/api/${entityName}`;
  return {
    list: (sort = null, limit = null) => apiRequest('GET', `${base}${queryString({}, sort, limit)}`),
    filter: (filters, sort = null, limit = null) => apiRequest('GET', `${base}${queryString(filters, sort, limit)}`),
    get: (id) => apiRequest('GET', `${base}/${id}`),
    create: (data) => apiRequest('POST', base, data),
    update: (id, data) => apiRequest('PUT', `${base}/${id}`, data),
    delete: (id) => apiRequest('DELETE', `${base}/${id}`),
    bulkCreate: (items) => apiRequest('POST', `${base}/bulk`, items),
  };
}

async function uploadFile(payload: { file: File; subject_id?: string | null }): Promise<{ file_url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.subject_id) formData.append('subject_id', payload.subject_id);
  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await responsePayload(response);
  if (!response.ok) {
    throw ApiError.fromResponse(response.status, (data && typeof data === 'object' ? data : {}) as ErrorPayload, 'Falha no upload');
  }
  return data as { file_url: string };
}

export const base44 = {
  entities: {
    Subject: createEntity<Subject>('subjects'), Document: createEntity<Document>('documents'),
    Question: createEntity<Question>('questions'), Summary: createEntity<Summary>('summaries'),
    Competition: createEntity<Competition>('competitions'), UserProgress: createEntity<UserProgress>('user_progress'),
    Flashcard: createEntity<Flashcard>('flashcards'), QuestionAttempt: createEntity<QuestionAttempt>('question_attempts'),
    StudySession: createEntity<StudySession>('study_sessions'), SubjectProgress: createEntity<SubjectProgress>('subject_progress'),
  },
  integrations: { Core: {
    UploadFile: uploadFile,
    InvokeLLM: (payload: { prompt: string; file_urls: string[]; response_json_schema: Record<string, unknown> }) => apiRequest<unknown>('POST', '/api/ai/invoke', payload),
    AnalisarDocumento: (payload: { file_url: string; question_type?: string; document_id?: string | null; operation?: string; question_count?: number }) =>
      apiRequest<{ resumo: string; perguntas: unknown[]; flashcards: unknown[] }>('POST', '/api/nlp/analisar-documento', payload),
  } },
  limits: { getStatus: () => apiRequest<GenerationStatus>('GET', '/api/limits/status') },
  subscriptions: {
    createCheckout: (plan: string) => apiRequest<{ checkout_url?: string }>('POST', '/api/subscriptions/checkout', { plan }),
    openPortal: () => apiRequest<{ portal_url?: string }>('POST', '/api/subscriptions/portal'),
    getStatus: () => apiRequest<Record<string, unknown>>('GET', '/api/subscriptions/status'),
  },
  auth: {
    me: () => apiRequest<User>('GET', '/api/auth/me'),
    async logout(redirectUrl?: string): Promise<void> { removeToken(); window.location.href = redirectUrl || '/login'; },
    redirectToLogin(): void { window.location.href = '/login'; },
  },
};
