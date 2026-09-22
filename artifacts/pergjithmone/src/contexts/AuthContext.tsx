import React, { createContext, useContext, useRef, useCallback, useMemo, useState, useEffect } from 'react';
import {
  useGetMe,
  useLogin,
  useLogout,
  useRegister,
  useChangePassword,
  getGetMeQueryKey,
  setAuthTokenGetter,
  setUnauthorizedHandler,
} from '@workspace/api-client-react-tsconfig';
import type { LoginInput, RegisterInput, User } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const USER_CACHE_KEY = 'pergjithmone_user';

function readCachedUser(): User | null {
  try {
    const s = localStorage.getItem(USER_CACHE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function writeCachedUser(u: User | null) {
  try {
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {}
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const accessTokenRef = useRef<string | null>(null);

  // Dedupe concurrent refresh attempts: the refresh token is rotated
  // single-use server-side, so if several requests 401 at once each calling
  // refresh separately would race — only the first exchange succeeds.
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  // Initial refresh finished (success or fail).
  const [tokenReady, setTokenReady] = useState(false);
  // Refresh cookie exchanged successfully — keep the user logged in.
  const [sessionRestored, setSessionRestored] = useState(false);

  // Session user — localStorage for instant paint, then refresh / /auth/me.
  const [sessionUser, setSessionUser] = useState<User | null>(readCachedUser);

  useMemo(() => {
    setAuthTokenGetter(() => accessTokenRef.current);
  }, []);

  const applyAuthSession = useCallback((accessToken: string, nextUser?: User | null) => {
    accessTokenRef.current = accessToken;
    if (nextUser) {
      setSessionUser(nextUser);
      writeCachedUser(nextUser);
      queryClient.setQueryData(getGetMeQueryKey(), nextUser);
    }
  }, [queryClient]);

  // Shared refresh-token exchange: cookie → access token (+ user).
  const refreshAccessToken = useCallback((): Promise<boolean> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const attemptOnce = async (): Promise<{ ok: boolean; retry429?: boolean }> => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.accessToken) {
            applyAuthSession(data.accessToken, data.user ?? null);
            return { ok: true };
          }
        }
        // Concurrent tab/request hit — retry shortly instead of logging out.
        if (res.status === 429) return { ok: false, retry429: true };
      } catch {
        // Network / no cookie
      }
      return { ok: false };
    };

    const attempt = (async (): Promise<boolean> => {
      let result = await attemptOnce();
      if (!result.ok && result.retry429) {
        await sleep(200);
        result = await attemptOnce();
      }
      if (result.ok) return true;
      accessTokenRef.current = null;
      return false;
    })();

    refreshInFlightRef.current = attempt;
    attempt.finally(() => {
      if (refreshInFlightRef.current === attempt) refreshInFlightRef.current = null;
    });
    return attempt;
  }, [applyAuthSession]);

  useEffect(() => {
    setUnauthorizedHandler(refreshAccessToken);
    return () => setUnauthorizedHandler(null);
  }, [refreshAccessToken]);

  // On mount: restore session from httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await refreshAccessToken();
      if (cancelled) return;
      setSessionRestored(ok);
      if (!ok) {
        // No valid refresh cookie — clear any stale cached persona.
        setSessionUser(null);
        writeCachedUser(null);
        queryClient.setQueryData(getGetMeQueryKey(), null);
      }
      setTokenReady(true);
    })();
    return () => { cancelled = true; };
  }, [refreshAccessToken, queryClient]);

  // Only hit /auth/me when we actually have an access token.
  const {
    data: fetchedUser,
    isLoading: meLoading,
    isSuccess: meSuccess,
    isFetching: meFetching,
  } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      queryKey: getGetMeQueryKey(),
      enabled: tokenReady && sessionRestored,
    },
  });

  // Sync from /me on success only — never treat "still loading / no data yet"
  // as logout (that was wiping sessionUser on every hard refresh).
  useEffect(() => {
    if (!tokenReady || !sessionRestored) return;
    if (meSuccess && fetchedUser) {
      setSessionUser(fetchedUser);
      writeCachedUser(fetchedUser);
    }
  }, [tokenReady, sessionRestored, meSuccess, fetchedUser]);

  const user: User | null = sessionUser;

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const changePasswordMutation = useChangePassword();

  const getNextPath = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    return next && next.startsWith('/') ? next : '/krijo';
  }, []);

  const handleLogin = useCallback(async (data: LoginInput) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      if (response?.accessToken && response?.user) {
        applyAuthSession(response.accessToken, response.user as User);
        setSessionRestored(true);
      } else if (response?.accessToken) {
        accessTokenRef.current = response.accessToken;
        setSessionRestored(true);
      }
      void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation(getNextPath());
    } catch (error: any) {
      toast({
        title: 'Hyrje dështoi',
        description: error?.data?.error || 'Kontrollo kredencialet e tua',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loginMutation, queryClient, setLocation, toast, getNextPath, applyAuthSession]);

  const handleRegister = useCallback(async (data: RegisterInput) => {
    try {
      const response = await registerMutation.mutateAsync({ data });
      if (response?.accessToken && response?.user) {
        applyAuthSession(response.accessToken, response.user as User);
        setSessionRestored(true);
      } else if (response?.accessToken) {
        accessTokenRef.current = response.accessToken;
        setSessionRestored(true);
      }
      void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation(getNextPath());
      toast({
        title: 'Mirë se vini!',
        description: 'Llogaria juaj u krijua me sukses.',
      });
    } catch (error: any) {
      toast({
        title: 'Regjistrimi dështoi',
        description: error?.data?.error || 'Ndodhi një gabim',
        variant: 'destructive',
      });
      throw error;
    }
  }, [registerMutation, queryClient, setLocation, toast, getNextPath, applyAuthSession]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore logout errors — clear local state regardless
    } finally {
      accessTokenRef.current = null;
      setSessionRestored(false);
      setSessionUser(null);
      writeCachedUser(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      setLocation('/hyr');
    }
  }, [logoutMutation, queryClient, setLocation]);

  const getToken = useCallback(() => accessTokenRef.current, []);

  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const response = await changePasswordMutation.mutateAsync({
      data: { currentPassword, newPassword },
    });
    if (response?.accessToken) {
      accessTokenRef.current = response.accessToken;
    }
  }, [changePasswordMutation]);

  // Stay in loading until mount refresh finishes; if restored, also wait for
  // /me when we don't have a user yet (avoid ProtectedRoute bounce to /hyr).
  const isLoading =
    !tokenReady
    || (sessionRestored && !user && (meLoading || meFetching));

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    getToken,
    changePassword: handleChangePassword,
  }), [user, isLoading, handleLogin, handleRegister, handleLogout, getToken, handleChangePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
