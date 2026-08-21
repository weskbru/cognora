const GENERATION_LIMIT_NOTICE_KEY = 'cognora:generation-limit-reached-after-login';

export function rememberGenerationLimitAfterLogin(generationsRemaining: unknown): void {
  if (typeof window === 'undefined') return;

  if (generationsRemaining === 0) {
    setStoredValue('session', GENERATION_LIMIT_NOTICE_KEY, '1');
    return;
  }

  removeStoredValue('session', GENERATION_LIMIT_NOTICE_KEY);
}

export function consumeGenerationLimitAfterLogin(): boolean {
  if (typeof window === 'undefined') return false;

  const shouldShowNotice = getStoredValue('session', GENERATION_LIMIT_NOTICE_KEY) === '1';
  removeStoredValue('session', GENERATION_LIMIT_NOTICE_KEY);
  return shouldShowNotice;
}
import { getStoredValue, removeStoredValue, setStoredValue } from '@/lib/safeStorage';
