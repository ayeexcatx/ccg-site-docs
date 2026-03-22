import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import UsersPage from '@/pages/UsersPage';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import CaptureSessions from '@/pages/CaptureSessions';
import CaptureSessionEntries from '@/pages/CaptureSessionEntries';
import FieldSession from '@/pages/FieldSession';
import MediaLibrary from '@/pages/MediaLibrary';
import TimelineReview from '@/pages/TimelineReview';
import ReviewCases from '@/pages/ReviewCases';
import SystemInstructions from '@/pages/SystemInstructions';
import ClientPortalHome from '@/pages/portal/ClientPortalHome';
import ClientProjectViewer from '@/pages/portal/ClientProjectViewer';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading CCG Portal...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/sessions" element={<CaptureSessions />} />
        <Route path="/session-entries" element={<CaptureSessionEntries />} />
        <Route path="/field" element={<FieldSession />} />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="/timeline-review" element={<TimelineReview />} />
        <Route path="/reviews" element={<ReviewCases />} />
        <Route path="/instructions" element={<SystemInstructions />} />
        <Route path="/portal/projects" element={<ClientPortalHome />} />
        <Route path="/portal/projects/:id" element={<ClientProjectViewer />} />
        <Route path="/segments" element={<Navigate to="/sessions" replace />} />
        <Route path="/routes" element={<Navigate to="/sessions" replace />} />
        <Route path="/assets" element={<Navigate to="/timeline-review" replace />} />
        <Route path="/markers" element={<Navigate to="/timeline-review" replace />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
