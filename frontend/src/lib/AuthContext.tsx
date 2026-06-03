import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getToken, removeToken } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL as string;
if (!API_URL) {
  throw new Error('[Cognora] VITE_API_URL não configurada.');
}

interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: { type: string } | null;
  appPublicSettings: null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkAppState: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchUser = async () => {
    const token = getToken();
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        removeToken();
        setUser(null);
      }
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = (shouldRedirect = true) => {
    removeToken();
    setUser(null);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await fetchUser();
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
      refreshUser,
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
