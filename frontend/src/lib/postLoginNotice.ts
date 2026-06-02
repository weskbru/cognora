const GENERATION_LIMIT_NOTICE_KEY = 'cognora:generation-limit-reached-after-login';

export function rememberGenerationLimitAfterLogin(generationsRemaining: unknown): void {
  if (typeof window === 'undefined') return;

  if (generationsRemaining === 0) {
    window.sessionStorage.setItem(GENERATION_LIMIT_NOTICE_KEY, '1');
    return;
  }

  window.sessionStorage.removeItem(GENERATION_LIMIT_NOTICE_KEY);
}

export function consumeGenerationLimitAfterLogin(): boolean {
  if (typeof window === 'undefined') return false;

  const shouldShowNotice = window.sessionStorage.getItem(GENERATION_LIMIT_NOTICE_KEY) === '1';
  window.sessionStorage.removeItem(GENERATION_LIMIT_NOTICE_KEY);
  return shouldShowNotice;
}
