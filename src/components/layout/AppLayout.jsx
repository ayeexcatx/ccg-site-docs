import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useUserProfile } from '@/lib/useUserProfile';
import { canAccessPath } from '@/lib/roleUtils';

export default function AppLayout() {
  const location = useLocation();
  const { profile, isLoading } = useUserProfile();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (profile && !canAccessPath({ role: profile.role, path: location.pathname })) {
    const fallback = profile.role === 'documenter' ? '/projects' : '/portal/projects';
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
