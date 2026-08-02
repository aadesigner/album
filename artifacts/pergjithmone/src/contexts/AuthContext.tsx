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
  // single-use server-side, so if several requests 401 at once (e.g. a page
  // that fires off multiple queries) each one calling refresh separately
  // would race — only the first exchange succeeds and the rest get 401,
  // wrongly logging the user out. All callers share one in-flight promise.
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  // Token ready = initial refresh attempt finished (success or fail)
  const [tokenReady, setTokenReady] = useState(false);

  // Cached user from localStorage for instant display while the query loads
  const cachedUser = useMemo(readCachedUser, []);

  // Register the token getter so all API calls carry the bearer token
  useMemo(() => {
    setAuthTokenGetter(() => accessTokenRef.current);
  }, []);

  // Shared refresh-token exchange: swaps the httpOnly refresh cookie for a
  // fresh access token. Used both on mount and whenever a request comes
  // back 401 because the short-lived access token expired mid-session
  // (e.g. a visitor spends a while browsing the create-album wizard before
  // finally submitting).
  const refreshAccessToken = useCallback((): Promise<boolean> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const attempt = (async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.accessToken) {
            accessTokenRef.current = data.accessToken;
            return true;
          }
        }
      } catch {
        // No refresh token / network error — not logged in
      }
      accessTokenRef.current = null;
      return false;
    })();

    refreshInFlightRef.current = attempt;
    attempt.finally(() => {
      if (refreshInFlightRef.current === attempt) refreshInFlightRef.current = null;
    });
    return attempt;
  }, []);

  // Let every API call transparently recover from an expired access token:
  // on a 401, try the refresh above once and, if it works, the request is
  // replayed automatically. Otherwise the user is left logged out rather
  // than silently failing forever.
  useEffect(() => {
    setUnauthorizedHandler(refreshAccessToken);
    return () => setUnauthorizedHandler(null);
  }, [refreshAccessToken]);

  // On mount: try the httpOnly refresh-token cookie to get a new access token.
  // This is what keeps users "permanently" logged in across page reloads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshAccessToken();
      if (!cancelled) setTokenReady(true);
    })();
    return () => { cancelled = true; };
  }, [refreshAccessToken]);

  // Only fire /auth/me after we have (or tried to get) an access token
  const { data: fetchedUser, isLoading: queryLoading } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      queryKey: getGetMeQueryKey(),
      enabled: tokenReady,
    },
  });

  // Seamless user value:
  //   • before token ready  → show cached localStorage user (no flash)
  //   • token ready + fetching → still show cached user (no flash)
  //   • token ready + settled  → show real API user (or null if not logged in)
  const user: User | null =
    !tokenReady || queryLoading
      ? cachedUser
      : (fetchedUser ?? null);

  // Keep localStorage in sync with the real fetched user
  useEffect(() => {
    if (!tokenReady || queryLoading) return;
    writeCachedUser(fetchedUser ?? null);
  }, [fetchedUser, tokenReady, queryLoading]);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const changePasswordMutation = useChangePassword();

  // Login/register can be reached with ?next=/some-path (e.g. the guest
  // AI-album flow sends users here mid-flow so it can resume them exactly
  // where they left off after auth). Fall back to the wizard when absent.
  const getNextPath = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    return next && next.startsWith('/') ? next : '/krijo';
  }, []);

  const handleLogin = useCallback(async (data: LoginInput) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      if (response?.accessToken) {
        accessTokenRef.current = response.accessToken;
      }
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation(getNextPath());
    } catch (error: any) {
      toast({
        title: 'Hyrje dështoi',
        description: error?.data?.error || 'Kontrollo kredencialet e tua',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loginMutation, queryClient, setLocation, toast, getNextPath]);

  const handleRegister = useCallback(async (data: RegisterInput) => {
    try {
      const response = await registerMutation.mutateAsync({ data });
      if (response?.accessToken) {
        accessTokenRef.current = response.accessToken;
      }
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
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
  }, [registerMutation, queryClient, setLocation, toast, getNextPath]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore logout errors — clear local state regardless
    } finally {
      accessTokenRef.current = null;
      writeCachedUser(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      setLocation('/hyr');
    }
  }, [logoutMutation, queryClient, setLocation]);

  const getToken = useCallback(() => accessTokenRef.current, []);

  // Rotates the access/refresh token pair server-side, so keep the in-memory
  // token in sync — no need to invalidate/refetch the user, their data didn't change.
  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const response = await changePasswordMutation.mutateAsync({
      data: { currentPassword, newPassword },
    });
    if (response?.accessToken) {
      accessTokenRef.current = response.accessToken;
    }
  }, [changePasswordMutation]);

  const value = useMemo(() => ({
    user,
    isLoading: !tokenReady,
    isAuthenticated: !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    getToken,
    changePassword: handleChangePassword,
  }), [user, tokenReady, handleLogin, handleRegister, handleLogout, getToken, handleChangePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
