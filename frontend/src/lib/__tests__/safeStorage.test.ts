import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStoredValue, removeStoredValue, setStoredValue } from '../safeStorage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('safeStorage', () => {
  it('mantem um fallback em memoria quando o navegador bloqueia a escrita', () => {
    const key = 'blocked-storage-test';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage bloqueado');
    });

    setStoredValue('local', key, 'valor');

    expect(getStoredValue('local', key)).toBe('valor');
    removeStoredValue('local', key);
  });
});
