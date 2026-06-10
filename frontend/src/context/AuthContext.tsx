import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { AuthSession } from '../types';

const STORAGE_KEY = 'tenantflow_session';

interface AuthContextValue {
  session: AuthSession | null;
  login: (tenantSlug: string, email: string, password: string) => Promise<void>;
  register: (input: {
    tenantName: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession);

  const persist = useCallback((s: AuthSession | null) => {
    setSession(s);
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async (tenantSlug: string, email: string, password: string) => {
    const res = await api.login(tenantSlug, email, password);
    persist({
      token: res.token,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        role: res.user.role as AuthSession['user']['role'],
        tenantId: res.user.tenantId,
      },
      tenant: { id: res.user.tenantId, name: tenantSlug, slug: tenantSlug },
    });
  }, [persist]);

  const register = useCallback(async (input: {
    tenantName: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => {
    const res = await api.register(input);
    persist({
      token: res.token,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.full_name,
        role: res.user.role as AuthSession['user']['role'],
        tenantId: res.tenant.id,
      },
      tenant: res.tenant,
    });
  }, [persist]);

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({ session, login, register, logout }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
