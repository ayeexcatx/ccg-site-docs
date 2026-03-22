import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRoleAwareDashboardData } from '@/lib/base44Workflows';
import { useUserProfile } from '@/lib/useUserProfile';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Camera, ClipboardList, FileVideo, FolderOpen, MessageSquare, Plus, Search } from 'lucide-react';

export default function Dashboard() {
  const { profile, isClientUser, isLoading: profileLoading } = useUserProfile();
  const { data: dashboardData = { projects: [], sessions: [], mediaFiles: [], reviewCases: [], clients: [], markers: [], entries: [], timelineItems: [] } } = useQuery({
    queryKey: ['dashboard-data', profile?.role || 'anonymous', profile?.id || 'none'],
    queryFn: () => getRoleAwareDashboardData({ role: profile?.role || 'anonymous', profile }),
    enabled: !!profile,
  });

  if (profileLoading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  const { projects = [], sessions = [], mediaFiles = [], reviewCases = [], entries = [], timelineItems = [] } = dashboardData;

  if (isClientUser) {
    return (
      <div className="space-y-6">
        <PageHeader title="CCG Documentation Portal" description="Review published project packages, searchable timelines, and released media." />
        <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.client_portal_home.title, sections: PAGE_GUIDANCE.client_portal_home.sections }} />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Published Projects" value={projects.length} icon={FolderOpen} />
          <StatCard title="Published Media" value={mediaFiles.length} icon={FileVideo} />
          <StatCard title="Open Review Cases" value={reviewCases.length} icon={MessageSquare} />
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Published projects</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => <Link key={project.id} to={`/portal/projects/${project.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/50">{project.project_name}</Link>)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Operational overview for the session + GPS-track + searchable timeline workflow.">
        <Link to="/projects"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Project</Button></Link>
      </PageHeader>
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.dashboard.title, sections: PAGE_GUIDANCE.dashboard.sections }} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Projects" value={projects.length} icon={FolderOpen} />
        <StatCard title="Capture Sessions" value={sessions.length} icon={Camera} />
        <StatCard title="Session Entries" value={entries.length} icon={ClipboardList} />
        <StatCard title="Media Files" value={mediaFiles.length} icon={FileVideo} />
        <StatCard title="Timeline Items" value={timelineItems.length} icon={Search} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Projects needing workflow attention</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 6).map((project) => <Link key={project.id} to={`/projects/${project.id}`} className="block rounded-lg border p-3 hover:bg-muted/50"><p className="text-sm font-medium">{project.project_name}</p><p className="text-xs text-muted-foreground">{project.project_code} · {project.documentation_status || 'status not set'}</p></Link>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Next likely actions</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border p-3">Create or update capture sessions for newly active projects.</div>
            <div className="rounded-lg border p-3">Add session entries so field observations become searchable later.</div>
            <div className="rounded-lg border p-3">Pair uploaded media with GPX or FIT tracks in Media Library before final review.</div>
            <div className="rounded-lg border p-3">Use Timeline Review to verify the searchable client-safe package.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
