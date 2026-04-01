import { createContext, useState, useContext, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('[Cognora] VITE_API_URL não configurada. Crie um arquivo .env.local com VITE_API_URL=http://localhost:8001')
}
const TOKEN_KEY = 'cognora_token'

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }
    // Valida o token buscando o usuario atual
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data || null);
        if (!data) localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: !isLoadingAuth && !user ? { type: 'auth_required' } : null,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
