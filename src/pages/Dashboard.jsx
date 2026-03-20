import React, { useMemo } from 'react';
import { getRoleAwareDashboardData } from '@/lib/base44Workflows';
import { getProjectReadinessSummary } from '@/lib/domainWorkflows';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUserProfile } from '@/lib/useUserProfile';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import PermissionNotice from '@/components/ui/PermissionNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileVideo, MessageSquare, MapPin, Plus, ArrowRight, Camera, BookmarkCheck } from 'lucide-react';

export default function Dashboard() {
  const { profile, isClientUser, isLoading: profileLoading, isDocumenter } = useUserProfile();

  const { data: dashboardData = { projects: [], sessions: [], mediaFiles: [], reviewCases: [], clients: [], markers: [] } } = useQuery({
    queryKey: ['dashboard-data', profile?.role || 'anonymous', profile?.id || 'none'],
    queryFn: () => getRoleAwareDashboardData({ role: profile?.role || 'anonymous', profile }),
    enabled: !!profile,
  });

  const { projects = [], sessions = [], mediaFiles = [], reviewCases = [], clients = [], markers = [] } = dashboardData;

  const readinessProjects = useMemo(() => projects.map((project) => ({
    project,
    readiness: getProjectReadinessSummary({
      project,
      segments: [],
      sessions: sessions.filter((session) => session.project_id === project.id),
      media: mediaFiles.filter((file) => file.project_id === project.id),
      markers: markers.filter((marker) => marker.project_id === project.id),
      routes: [],
    }),
  })), [projects, sessions, mediaFiles, markers]);

  if (profileLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (isClientUser) {
    return <ClientDashboard projects={projects} reviewCases={reviewCases} mediaFiles={mediaFiles} />;
  }

  const widgets = [
    { title: 'Sessions ready for field', value: sessions.filter((s) => ['planned', 'ready'].includes(s.session_status)).length, icon: Camera, subtitle: isDocumenter ? 'Assigned to you or your scoped projects' : 'Upcoming operational work' },
    { title: 'Uploads needing mapping', value: mediaFiles.filter((m) => !m.street_segment_id || !m.capture_session_id).length, icon: FileVideo, subtitle: 'Media metadata needs project context' },
    { title: 'Markers needing confirmation', value: markers.filter((m) => m.confidence_level !== 'confirmed').length, icon: BookmarkCheck, subtitle: 'Keep internal-only until confirmed' },
    { title: 'Review cases needing response', value: reviewCases.filter((r) => ['open', 'in_progress'].includes(r.status)).length, icon: MessageSquare, subtitle: 'Outstanding review workload' },
  ];

  const nearingPublish = readinessProjects.filter(({ readiness }) => !readiness.publishReadiness && readiness.blockers.length <= 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Role-aware operational dashboard for field readiness, upload quality, marker confirmation, and publish preparation."
        helpText="Widgets adapt to the signed-in role so staff see only the work they can act on and clients see only published information."
      >
        {!isDocumenter && <Link to="/projects"><Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Project</Button></Link>}
      </PageHeader>

      <PermissionNotice
        audience={[
          'Super Admin and Company Admin can monitor all operational metrics.',
          'Documenters see only scoped field workflows and should not use the dashboard for publishing decisions.',
        ]}
        internalData="Operational statuses, incomplete uploads, unconfirmed markers, and open review workload are internal-only until a project is deliberately published."
        clientVisibleData="Only published project counts and approved portal content move into client-facing experiences; this dashboard itself is company-side only."
        publishingEffect="Publishing removes the need for staff to manually explain whether clients can see a project, but it does not expose internal QA or workflow metadata."
        mistakesToAvoid="Do not treat dashboard totals as client-safe. Unconfirmed markers, draft notes, and unmapped media must stay internal until cleaned up and published intentionally."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Scoped Projects" value={projects.length} icon={FolderOpen} subtitle={isDocumenter ? 'Assigned project scope' : `${clients.length} clients represented`} />
        {widgets.map((widget) => <StatCard key={widget.title} {...widget} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Projects nearing publish readiness</CardTitle>
              <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {nearingPublish.slice(0, 5).map(({ project, readiness }) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{project.project_name}</p>
                    <p className="text-xs text-muted-foreground">{readiness.blockers.length === 0 ? 'Ready to publish' : readiness.blockers[0]}</p>
                  </div>
                  <StatusBadge status={readiness.publishReadiness ? 'published' : 'pending'} />
                </div>
              </Link>
            ))}
            {nearingPublish.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No scoped projects are close to publish readiness yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Recent operational activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{s.session_name}</p>
                  <p className="text-xs text-muted-foreground">{s.capture_method} · {s.capture_date || 'No date set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.session_status} />
                  <StatusBadge status={s.qa_status} />
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No scoped sessions are available.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientDashboard({ projects, reviewCases, mediaFiles }) {
  const publishedProjects = projects.filter((p) => p.published_to_client);
  const openCases = reviewCases.filter((r) => ['open', 'in_progress'].includes(r.status));
  return (
    <div className="space-y-6">
      <PageHeader title="Welcome to CCG Documentation Portal" description="Review published project packages, approved media, and client-safe responses from CCG." />
      <PermissionNotice
        audience={[
          'Client Managers can review published projects across their organization and monitor shared case responses.',
          'Client Viewers have read-only access to the same published package without internal workflow controls.',
        ]}
        internalData="Internal QA commentary, project readiness blockers, documenter workflow controls, and company review decisions are intentionally hidden from this dashboard."
        clientVisibleData="Only published projects, published media counts, and client-facing case responses are shown here."
        publishingEffect="A project appears here only after CCG publishes it. Draft or review-stage materials remain invisible until release."
        mistakesToAvoid="Do not assume unpublished work is missing; it may still be under internal review. Use client-visible notes and published case updates as the authoritative client record."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Published Projects" value={publishedProjects.length} icon={FolderOpen} />
        <StatCard title="Published Media" value={mediaFiles.length} icon={MapPin} subtitle="Approved for client reference" />
        <StatCard title="Open Review Responses" value={openCases.length} icon={MessageSquare} subtitle="Awaiting CCG follow-up" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Your Projects</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {publishedProjects.map((p) => (
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
