import { reportFrontendEvent } from '@/api/observability';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

let installed = false;
let originalFetch: typeof fetch | null = null;

function messageFromUnknown(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stackFromUnknown(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined;
}

function requestInfo(input: RequestInfo | URL, init?: RequestInit): { url: URL; method: string } | null {
  try {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    const url = new URL(rawUrl, window.location.origin);
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    return { url, method: method.toUpperCase() };
  } catch {
    return null;
  }
}

function shouldTrackApiFailure(url: URL): boolean {
  if (!API_URL) return false;
  const apiBase = new URL(API_URL);
  if (url.origin !== apiBase.origin) return false;
  if (url.pathname === '/api/observability/frontend-events') return false;
  return url.pathname.startsWith('/api/');
}

export function installFrontendObservability(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  originalFetch = window.fetch.bind(window);

  window.addEventListener('error', (event) => {
    reportFrontendEvent({
      level: 'error',
      event_type: 'frontend_error',
      message: event.message || 'Erro inesperado no navegador.',
      metadata: {
        path: window.location.pathname,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportFrontendEvent({
      level: 'error',
      event_type: 'frontend_unhandled_rejection',
      message: messageFromUnknown(event.reason) || 'Promise rejeitada sem tratamento.',
      metadata: {
        path: window.location.pathname,
        stack: stackFromUnknown(event.reason),
      },
    });
  });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const fetchImpl = originalFetch || fetch;
    const info = requestInfo(input, init);
    const startedAt = performance.now();

    try {
      const response = await fetchImpl(input, init);
      if (info && shouldTrackApiFailure(info.url) && !response.ok) {
        reportFrontendEvent({
          level: response.status >= 500 ? 'error' : 'warning',
          event_type: 'frontend_api_failure',
          message: `API retornou status ${response.status}.`,
          request_id: response.headers.get('x-request-id'),
          metadata: {
            method: info.method,
            path: info.url.pathname,
            status: response.status,
            duration_ms: Math.round(performance.now() - startedAt),
          },
        });
      }
      return response;
    } catch (error) {
      if (info && shouldTrackApiFailure(info.url)) {
        reportFrontendEvent({
          level: 'error',
          event_type: 'frontend_api_failure',
          message: messageFromUnknown(error) || 'Falha de rede ao chamar API.',
          metadata: {
            method: info.method,
            path: info.url.pathname,
            duration_ms: Math.round(performance.now() - startedAt),
            stack: stackFromUnknown(error),
          },
        });
      }
      throw error;
    }
  };
}
