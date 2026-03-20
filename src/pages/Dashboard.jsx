import React from 'react';
import { getRoleAwareDashboardData } from '@/lib/base44Workflows';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUserProfile } from '@/lib/useUserProfile';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileVideo, MessageSquare, Building2, MapPin, Plus, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { profile, isCompanyUser, isClientUser, isLoading: profileLoading } = useUserProfile();

  const { data: dashboardData = { projects: [], sessions: [], mediaFiles: [], reviewCases: [], clients: [] } } = useQuery({
    queryKey: ['dashboard-data', profile?.role || 'anonymous'],
    queryFn: () => getRoleAwareDashboardData({ role: profile?.role || 'anonymous' }),
    enabled: !!profile,
  });

  const { projects = [], sessions = [], mediaFiles = [], reviewCases = [], clients = [] } = dashboardData;

  if (profileLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (isClientUser) {
    return <ClientDashboard projects={projects} profile={profile} />;
  }

  const activeProjects = projects.filter(p => p.project_status === 'active');
  const sessionsNeedingReview = sessions.filter(s => s.qa_status === 'needs_review');
  const openCases = reviewCases.filter(r => r.status === 'open' || r.status === 'in_progress');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of all CCG site documentation activity. Manage projects, review sessions, and track documentation progress."
        helpText="This dashboard shows a summary of all active documentation work. Use the sidebar to navigate to specific sections."
      >
        <Link to="/projects">
          <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Projects" value={projects.length} icon={FolderOpen} subtitle={`${activeProjects.length} active`} />
        <StatCard title="Clients" value={clients.length} icon={Building2} />
        <StatCard title="Media Files" value={mediaFiles.length} icon={FileVideo} />
        <StatCard title="Open Reviews" value={openCases.length} icon={MessageSquare} subtitle={sessionsNeedingReview.length + ' sessions need QA'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
              <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 5).map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                <div>
                  <p className="text-sm font-medium">{p.project_name}</p>
                  <p className="text-xs text-muted-foreground">{p.project_code} · {p.municipality}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.project_status} />
                  <StatusBadge status={p.documentation_status} />
                </div>
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects yet. Create your first project to get started.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
              <Link to="/sessions" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{s.session_name}</p>
                  <p className="text-xs text-muted-foreground">{s.capture_method} · {s.capture_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.session_status} />
                  <StatusBadge status={s.qa_status} />
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No capture sessions yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientDashboard({ projects, profile }) {
  const publishedProjects = projects.filter(p => p.published_to_client);
  return (
    <div>
      <PageHeader
        title="Welcome to CCG Documentation Portal"
        description="View your pre-construction site documentation, browse recorded streets and segments, and review evidence for your projects."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard title="Your Projects" value={publishedProjects.length} icon={FolderOpen} />
        <StatCard title="Available Segments" value="—" icon={MapPin} subtitle="Browse by street" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Your Projects</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {publishedProjects.map(p => (
            <Link key={p.id} to={`/portal/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <div>
                <p className="text-sm font-medium">{p.project_name}</p>
                <p className="text-xs text-muted-foreground">{p.municipality} · {p.project_code}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
          {publishedProjects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No published projects available yet. Contact your project manager for access.</p>}
        </CardContent>
      </Card>
    </div>
  );
}