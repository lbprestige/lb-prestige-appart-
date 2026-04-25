import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
