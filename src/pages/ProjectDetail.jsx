import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Camera, FileVideo, Bookmark, ArrowRight } from 'lucide-react';

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.length - 1];

  const { data: projects = [] } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
  });

  const project = projects[0];

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', projectId],
    queryFn: () => base44.entities.StreetSegment.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: media = [] } = useQuery({
    queryKey: ['media', projectId],
    queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: markers = [] } = useQuery({
    queryKey: ['markers', projectId],
    queryFn: () => base44.entities.MediaMarker.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  if (!project) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <PageHeader title={project.project_name} description={`${project.project_code} · ${project.municipality || ''} ${project.county ? ', ' + project.county : ''} ${project.state || ''}`}>
        <StatusBadge status={project.project_status} />
        <StatusBadge status={project.documentation_status} />
        {project.published_to_client && <StatusBadge status="published" />}
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Segments" value={segments.length} icon={MapPin} />
        <StatCard title="Sessions" value={sessions.length} icon={Camera} />
        <StatCard title="Media Files" value={media.length} icon={FileVideo} />
        <StatCard title="Markers" value={markers.length} icon={Bookmark} />
      </div>

      {project.work_scope_summary && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Work Scope</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{project.work_scope_summary}</p></CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Street Segments</CardTitle>
              <Link to="/segments" className="text-xs text-primary hover:underline">Manage</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {segments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No segments yet. Add street segments from the Segments page.</p>
            ) : segments.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{s.street_name}</p>
                  <p className="text-xs text-muted-foreground">{s.segment_code} · {s.segment_type?.replace(/_/g, ' ')} · {s.from_intersection} to {s.to_intersection}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Capture Sessions</CardTitle>
              <Link to="/sessions" className="text-xs text-primary hover:underline">Manage</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sessions yet. Create capture sessions from the Sessions page.</p>
            ) : sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{s.session_name}</p>
                  <p className="text-xs text-muted-foreground">{s.capture_method} · {s.view_type?.replace(/_/g, ' ')} · {s.capture_date}</p>
                </div>
                <StatusBadge status={s.session_status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}