import React, { createContext, useContext, useState, useEffect } from 'react';
import { OneSignalService } from '../services/OneSignalService';

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
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token and user on mount
    const storedToken = localStorage.getItem('acorde_token');
    const storedUser = localStorage.getItem('acorde_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      try { OneSignalService.loginUser(parsedUser.id); } catch(e){}
    }
    
    setIsLoading(false);
  }, []);

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
      OneSignalService.promptForPermission();
    } catch(e){}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('acorde_token');
    localStorage.removeItem('acorde_user');
    try { OneSignalService.logoutUser(); } catch(e){}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
