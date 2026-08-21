interface ApiErrorPayload {
  detail?: string | { message?: string; code?: string };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  static fromResponse(status: number, payload: ApiErrorPayload, fallback: string): ApiError {
    const detail = payload.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || fallback;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    return new ApiError(status, message, code);
  }
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
