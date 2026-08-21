import { describe, expect, it } from 'vitest';
import { ApiError, getErrorMessage } from '../apiError';

describe('ApiError', () => {
  it('preserva status, codigo e mensagem estruturada do backend', () => {
    const error = ApiError.fromResponse(
      403,
      { detail: { code: 'LIMIT_REACHED', message: 'Limite atingido.' } },
      'Falha',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
    expect(error.code).toBe('LIMIT_REACHED');
    expect(getErrorMessage(error)).toBe('Limite atingido.');
  });

  it('usa a mensagem padrao para valores desconhecidos', () => {
    expect(getErrorMessage({ message: 'objeto simples' }, 'Falha segura')).toBe('Falha segura');
  });
});
