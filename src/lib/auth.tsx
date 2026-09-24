import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { apiFetch, logout as apiLogout, purgeCaches, refreshSession, setUnauthorizedHandler } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const signIn = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    await purgeCaches();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession(): Promise<void> {
      // El refresh token vive en una cookie httpOnly: la unica forma de saber si
      // hay sesion es intentar el refresco.
      try {
        const refreshed = await refreshSession();
        if (!refreshed) {
          setReady(true);
          return;
        }
        const profile = await apiFetch<User>('/auth/me');
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        // sin sesion valida: se muestra el ingreso
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, ready, signIn, signOut }),
    [user, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
