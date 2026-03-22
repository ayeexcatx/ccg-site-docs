import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import PublishBadge from '@/components/ui/PublishBadge';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, ClipboardList, Clock3, FileVideo, MapPinned, Send } from 'lucide-react';

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
  const { id: projectId } = useParams();
  const { data: projectResults = [] } = useQuery({ queryKey: ['project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: entries = [] } = useQuery({ queryKey: ['session-entries', projectId], queryFn: () => base44.entities.CaptureSessionEntry.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', projectId], queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: tracks = [] } = useQuery({ queryKey: ['tracks', projectId], queryFn: () => base44.entities.GpsTrack.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: timelineItems = [] } = useQuery({ queryKey: ['timeline-items', projectId], queryFn: () => base44.entities.TimelineIndexEntry.filter({ project_id: projectId }), enabled: !!projectId });
  const project = projectResults[0];

  if (!project) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>;

  const generatedSessionCount = sessions.filter((session) => session.capture_session_entry_id).length;
  const uploadedVideoCount = mediaFiles.filter((item) => item.media_type === 'video' || item.media_type === 'video_360').length;
  const pairedTrackCount = mediaFiles.filter((item) => item.gps_track_id || item.track_pairing_status === 'paired').length;
  const indexedTimelineCount = timelineItems.length;
  const publishedMediaCount = mediaFiles.filter((item) => item.publish_to_client).length;
  const readinessSteps = [
    { label: 'Entries created', ready: entries.length > 0, detail: `${entries.length} entry definition(s) ready to generate field work.` },
    { label: 'Sessions generated', ready: generatedSessionCount > 0 || sessions.length > 0, detail: `${sessions.length} total session(s), ${generatedSessionCount} tied directly to entries.` },
    { label: 'Videos uploaded', ready: uploadedVideoCount > 0, detail: `${uploadedVideoCount} uploaded video file(s) in the session stack.` },
    { label: 'GPX/FIT paired', ready: pairedTrackCount > 0 || tracks.length > 0, detail: `${tracks.length} track file(s), ${pairedTrackCount} paired media file(s).` },
    { label: 'Timeline indexed', ready: indexedTimelineCount > 0, detail: `${indexedTimelineCount} searchable timeline row(s) created.` },
    { label: 'Published to client', ready: project.published_to_client, detail: project.published_to_client ? `${publishedMediaCount} media file(s) are client-visible.` : 'Still internal-only.' },
  ];

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={`${project.project_code} · ${project.municipality || ''} ${project.state || ''}`}>
        <StatusBadge status={project.project_status} />
        <StatusBadge status={project.documentation_status} />
        <PublishBadge state={project.published_to_client ? 'client_published' : 'draft_data'} />
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.project_detail.title, sections: PAGE_GUIDANCE.project_detail.sections }} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Entries created" value={entries.length} detail="Roadway and range definitions ready for auto-generation." icon={ClipboardList} />
        <MetricCard title="Sessions generated" value={sessions.length} detail={`${generatedSessionCount} session(s) came directly from entry generation.`} icon={Camera} />
        <MetricCard title="Videos uploaded" value={uploadedVideoCount} detail="Field video attached to sessions." icon={FileVideo} />
        <MetricCard title="GPX / FIT paired" value={pairedTrackCount} detail={`${tracks.length} total track file(s) available for sync.`} icon={MapPinned} />
        <MetricCard title="Timeline indexed" value={indexedTimelineCount} detail="Search-ready metadata rows created from session playback." icon={Clock3} />
        <MetricCard title="Published to client" value={project.published_to_client ? 'Yes' : 'No'} detail={`${publishedMediaCount} published media file(s) currently client-visible.`} icon={Send} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Project summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{project.work_scope_summary || 'No work scope summary entered yet.'}</p>
            <p><span className="font-medium text-foreground">Project limits:</span> {project.project_limits_description || 'Not provided.'}</p>
            <p><span className="font-medium text-foreground">Address / range summary:</span> {project.address_range_summary || 'Not provided.'}</p>
            <p><span className="font-medium text-foreground">Portal summary:</span> {project.client_portal_summary || 'No client portal summary yet.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Readiness checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {readinessSteps.map((step) => (
              <div key={step.label} className="rounded-lg border p-3">
                <p className="font-medium text-foreground">{step.label}: {step.ready ? 'Ready' : 'Pending'}</p>
                <p className="mt-1">{step.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
