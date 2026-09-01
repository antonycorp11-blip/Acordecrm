import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OneSignalService } from '../services/OneSignalService';
import { setupAppResumeListener, APP_RESUMED_EVENT, API_AUTH_INVALID_EVENT } from '../services/apiClient';

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('acorde_token');
    localStorage.removeItem('acorde_user');
    try { OneSignalService.logoutUser(); } catch(e){}
  }, []);

  const verifySession = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('acorde_token');
    if (!storedToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user) {
          setUser(data.user);
          localStorage.setItem('acorde_user', JSON.stringify(data.user));
          if (data.token) {
            setToken(data.token);
            localStorage.setItem('acorde_token', data.token);
          }
          try { OneSignalService.loginUser(data.user.id); } catch(e){}
          return true;
        }
      } else if (res.status === 401 || res.status === 403) {
        console.warn('[AUTH] Sessão expirada na verificação.');
        logout();
        return false;
      }
    } catch (e) {
      console.warn('[AUTH] Erro de rede ao verificar sessão (possível modo offline):', e);
      // Mantém a sessão local caso seja apenas oscilação de rede momentânea
    }
    return true;
  }, [logout]);

  useEffect(() => {
    setupAppResumeListener();

    // Check local storage for token and user on mount
    const storedToken = localStorage.getItem('acorde_token');
    const storedUser = localStorage.getItem('acorde_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        try { OneSignalService.loginUser(parsedUser.id); } catch(e){}
      } catch (_) {}
    }
    
    setIsLoading(false);

    // Valida silenciosamente em background
    if (storedToken) {
      verifySession();
    }

    // Escuta evento de retorno do app do segundo plano (PWA Wake-up)
    const handleResume = () => {
      verifySession();
    };

    const handleAuthInvalid = () => {
      logout();
    };

    window.addEventListener(APP_RESUMED_EVENT, handleResume);
    window.addEventListener(API_AUTH_INVALID_EVENT, handleAuthInvalid);

    return () => {
      window.removeEventListener(APP_RESUMED_EVENT, handleResume);
      window.removeEventListener(API_AUTH_INVALID_EVENT, handleAuthInvalid);
    };
  }, [verifySession, logout]);

  const login = async (email: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha na autenticação');
    }

    const { token: newToken, user: newUser } = await res.json();
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('acorde_token', newToken);
    localStorage.setItem('acorde_user', JSON.stringify(newUser));
    
    try { 
      OneSignalService.loginUser(newUser.id);
    } catch(e){}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
        verifySession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
