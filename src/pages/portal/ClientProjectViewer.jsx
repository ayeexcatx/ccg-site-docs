import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, FileVideo, Bookmark, Search, Image, Video, File } from 'lucide-react';
import { VIEW_TYPE_LABELS, SEGMENT_TYPE_LABELS, MARKER_TYPE_LABELS } from '@/lib/constants';

export default function ClientProjectViewer() {
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.length - 1];
  const [search, setSearch] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
  });
  const project = projects[0];

  const { data: segments = [] } = useQuery({
    queryKey: ['portal-segments', projectId],
    queryFn: () => base44.entities.StreetSegment.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: media = [] } = useQuery({
    queryKey: ['portal-media', projectId],
    queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: markers = [] } = useQuery({
    queryKey: ['portal-markers', projectId],
    queryFn: () => base44.entities.MediaMarker.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const publishedMedia = media.filter(m => m.publish_to_client);
  const clientMarkers = markers.filter(m => m.is_client_visible);

  const filteredSegments = segments.filter(s =>
    s.street_name?.toLowerCase().includes(search.toLowerCase()) || s.from_intersection?.toLowerCase().includes(search.toLowerCase()) || s.to_intersection?.toLowerCase().includes(search.toLowerCase())
  );

  if (!project) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const MEDIA_ICONS = { photo: Image, video: Video, video_360: Video, thumbnail: Image, preview_clip: Video, document: File, export: File };

  return (
    <div>
      <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <PageHeader title={project.project_name} description={`${project.municipality || ''} ${project.county ? `, ${project.county}` : ''} ${project.state || ''}`} />

      {project.client_portal_summary && (
        <Card className="mb-6">
          <CardContent className="p-4"><p className="text-sm text-muted-foreground">{project.client_portal_summary}</p></CardContent>
        </Card>
      )}
      {project.client_visible_notes && (
        <Card className="mb-6">
          <CardContent className="p-4"><p className="text-sm text-muted-foreground">{project.client_visible_notes}</p></CardContent>
        </Card>
      )}

      <HowThisWorks title="How to Browse Documentation" items={[
        "Use the Segments tab to browse documented streets and areas.",
        "The Media tab shows all published photos, videos, and documents.",
        "The Markers tab lists searchable reference points within media files — intersections, landmarks, and more.",
        "Use the search bar to find specific streets, intersections, or landmarks."
      ]} />

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search streets, intersections, landmarks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="segments">
        <TabsList className="mb-4">
          <TabsTrigger value="segments">Segments ({segments.length})</TabsTrigger>
          <TabsTrigger value="media">Media ({publishedMedia.length})</TabsTrigger>
          <TabsTrigger value="markers">Markers ({clientMarkers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          {filteredSegments.length === 0 ? (
            <EmptyState icon={MapPin} title="No segments" description="Street segments for this project will appear here." />
          ) : (
            <div className="grid gap-3">
              {filteredSegments.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{s.street_name} {s.segment_name ? `— ${s.segment_name}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{s.from_intersection || '?'} to {s.to_intersection || '?'} · {SEGMENT_TYPE_LABELS[s.segment_type] || s.segment_type}</p>
                        {s.client_visible_notes && <p className="text-xs text-muted-foreground mt-1">{s.client_visible_notes}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="media">
          {publishedMedia.length === 0 ? (
            <EmptyState icon={FileVideo} title="No published media" description="Media files will be available once published by the documentation team." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedMedia.map(m => {
                const MediaIcon = MEDIA_ICONS[m.media_type] || File;
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                          {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" className="w-12 h-12 rounded object-cover" /> : <MediaIcon className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{m.media_title}</p>
                          <p className="text-xs text-muted-foreground">{VIEW_TYPE_LABELS[m.view_type] || m.view_type} · {m.media_type}</p>
                          {m.client_visible_notes && <p className="text-xs text-muted-foreground mt-1">{m.client_visible_notes}</p>}
                          {m.file_url && <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">View File →</a>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="markers">
          {clientMarkers.length === 0 ? (
            <EmptyState icon={Bookmark} title="No markers" description="Searchable markers for this project will appear here." />
          ) : (
            <div className="space-y-2">
              {clientMarkers.map(m => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Bookmark className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.marker_label}</p>
                      <p className="text-xs text-muted-foreground">{MARKER_TYPE_LABELS[m.marker_type] || m.marker_type} {m.timestamp_seconds ? `· @ ${Math.floor(m.timestamp_seconds / 60)}:${String(Math.floor(m.timestamp_seconds % 60)).padStart(2, '0')}` : ''}</p>
                      {m.client_visible_notes && <p className="text-xs text-muted-foreground mt-0.5">{m.client_visible_notes}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}