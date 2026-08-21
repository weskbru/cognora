interface ApiUrlOptions {
  configuredUrl?: string;
  isProduction: boolean;
  useDirectApi: boolean;
}

export function resolveApiUrl({ configuredUrl, isProduction, useDirectApi }: ApiUrlOptions): string {
  const normalized = configuredUrl?.trim().replace(/\/$/, '') ?? '';
  if (isProduction && !useDirectApi) return '';
  if (!normalized) {
    throw new Error('[Cognora] VITE_API_URL nao configurada para acesso direto a API.');
  }
  return normalized;
}

// Na Vercel, /api e encaminhado ao Render pelo vercel.json. Assim o cookie
// HttpOnly permanece first-party e nao depende de cookies de terceiros.
export const API_URL = resolveApiUrl({
  configuredUrl: import.meta.env.VITE_API_URL,
  isProduction: import.meta.env.PROD,
  useDirectApi: import.meta.env.VITE_USE_DIRECT_API === 'true',
});
