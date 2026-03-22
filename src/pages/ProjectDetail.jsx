import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import PublishBadge from '@/components/ui/PublishBadge';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, ClipboardList, Clock3, FileVideo } from 'lucide-react';

function MetricCard({ title, value, detail, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
          </div>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectDetail() {
  const projectId = window.location.pathname.split('/').pop();
  const { data: projectResults = [] } = useQuery({ queryKey: ['project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', projectId], queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: entries = [] } = useQuery({ queryKey: ['session-entries', projectId], queryFn: () => base44.entities.CaptureSessionEntry.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: timelineItems = [] } = useQuery({ queryKey: ['timeline-items', projectId], queryFn: () => base44.entities.TimelineIndexItem.filter({ project_id: projectId }), enabled: !!projectId });
  const project = projectResults[0];

  if (!project) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>;

  const pairedMediaCount = mediaFiles.filter((item) => item.gps_track_id || item.track_pairing_status === 'paired').length;
  const publishedMediaCount = mediaFiles.filter((item) => item.publish_to_client).length;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={`${project.project_code} · ${project.municipality || ''} ${project.state || ''}`}>
        <StatusBadge status={project.project_status} />
        <StatusBadge status={project.documentation_status} />
        <PublishBadge state={project.published_to_client ? 'client_published' : 'draft_data'} />
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.project_detail.title, sections: PAGE_GUIDANCE.project_detail.sections }} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Capture sessions" value={sessions.length} detail="Operational sessions created for this project." icon={Camera} />
        <MetricCard title="Session entries" value={entries.length} detail="Notes, observations, and pairing moments recorded so far." icon={ClipboardList} />
        <MetricCard title="Media files" value={mediaFiles.length} detail={`${pairedMediaCount} already paired with GPS track context.`} icon={FileVideo} />
        <MetricCard title="Timeline items" value={timelineItems.length} detail="Searchable timeline records ready for internal or client review." icon={Clock3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Project summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{project.work_scope_summary || 'No work scope summary entered yet.'}</p>
            <p><span className="font-medium text-foreground">Project limits:</span> {project.project_limits_description || 'Not provided.'}</p>
            <p><span className="font-medium text-foreground">Portal summary:</span> {project.client_portal_summary || 'No client portal summary yet.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Release readiness snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border p-3">{sessions.length > 0 ? 'Sessions exist for this project.' : 'Create sessions before field work can be tracked.'}</div>
            <div className="rounded-lg border p-3">{entries.length > 0 ? 'Entries are being captured for this project.' : 'Add capture session entries so the timeline becomes searchable.'}</div>
            <div className="rounded-lg border p-3">{pairedMediaCount > 0 ? 'At least some media has been paired with GPS tracks.' : 'Pair GPX or FIT data to media before final timeline review.'}</div>
            <div className="rounded-lg border p-3">{timelineItems.length > 0 ? 'Timeline indexing has started.' : 'Index session and media records into timeline review before portal release.'}</div>
            <div className="rounded-lg border p-3">{project.published_to_client ? `Client portal is live with ${publishedMediaCount} published media files.` : 'Project is still internal-only and not visible to clients.'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
