const TOKEN_KEY = 'cognora_token'
const REMEMBER_KEY = 'cognora_remember'

export function getToken(): string | null {
  return getStoredValue('session', TOKEN_KEY) || getStoredValue('local', TOKEN_KEY)
}

export function setToken(token: string, remember: boolean): void {
  removeToken()
  if (remember) {
    setStoredValue('local', TOKEN_KEY, token)
    setStoredValue('local', REMEMBER_KEY, '1')
  } else {
    setStoredValue('session', TOKEN_KEY, token)
  }
}

export function removeToken(): void {
  removeStoredValue('local', TOKEN_KEY)
  removeStoredValue('local', REMEMBER_KEY)
  removeStoredValue('session', TOKEN_KEY)
}
import { getStoredValue, removeStoredValue, setStoredValue } from '@/lib/safeStorage'
