import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-4 border-muted-foreground border-t-foreground animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/hyr" />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
