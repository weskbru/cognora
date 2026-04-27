const TOKEN_KEY = 'cognora_token'
const REMEMBER_KEY = 'cognora_remember'

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string, remember: boolean): void {
  removeToken()
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REMEMBER_KEY, '1')
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REMEMBER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}
