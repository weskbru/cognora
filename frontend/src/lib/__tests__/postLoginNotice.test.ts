import { afterEach, describe, expect, it } from 'vitest';
import {
  consumeGenerationLimitAfterLogin,
  rememberGenerationLimitAfterLogin,
} from '../postLoginNotice';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('postLoginNotice', () => {
  it('shows the limit notice once when login returns zero generations', () => {
    rememberGenerationLimitAfterLogin(0);

    expect(consumeGenerationLimitAfterLogin()).toBe(true);
    expect(consumeGenerationLimitAfterLogin()).toBe(false);
  });

  it('does not show the limit notice when generations remain', () => {
    rememberGenerationLimitAfterLogin(2);

    expect(consumeGenerationLimitAfterLogin()).toBe(false);
  });
});
