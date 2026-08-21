type StorageKind = 'local' | 'session';

const fallbackStores: Record<StorageKind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

function browserStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getStoredValue(kind: StorageKind, key: string): string | null {
  try {
    return browserStorage(kind)?.getItem(key) ?? fallbackStores[kind].get(key) ?? null;
  } catch {
    return fallbackStores[kind].get(key) ?? null;
  }
}

export function setStoredValue(kind: StorageKind, key: string, value: string): void {
  fallbackStores[kind].set(key, value);
  try { browserStorage(kind)?.setItem(key, value); } catch { /* fallback em memoria */ }
}

export function removeStoredValue(kind: StorageKind, key: string): void {
  fallbackStores[kind].delete(key);
  try { browserStorage(kind)?.removeItem(key); } catch { /* storage bloqueado */ }
}
