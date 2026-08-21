import { describe, expect, it } from 'vitest';

import { resolveApiUrl } from '../apiUrl';

describe('resolveApiUrl', () => {
  it('usa proxy same-origin por padrao em producao', () => {
    expect(resolveApiUrl({
      configuredUrl: 'https://cognora.onrender.com',
      isProduction: true,
      useDirectApi: false,
    })).toBe('');
  });

  it('mantem acesso direto no desenvolvimento', () => {
    expect(resolveApiUrl({
      configuredUrl: 'http://localhost:8001/',
      isProduction: false,
      useDirectApi: false,
    })).toBe('http://localhost:8001');
  });

  it('permite optar por API direta em outro provedor', () => {
    expect(resolveApiUrl({
      configuredUrl: 'https://api.example.com',
      isProduction: true,
      useDirectApi: true,
    })).toBe('https://api.example.com');
  });
});
