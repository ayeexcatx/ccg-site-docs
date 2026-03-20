import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatingGuide, WorkflowStepsPanel } from '@/components/ui/OperatingGuidance';
import { Bookmark, File, FileVideo, Image, MapPin, Search, Video, ArrowLeft } from 'lucide-react';
import { MARKER_TYPE_LABELS, SEGMENT_TYPE_LABELS, VIEW_TYPE_LABELS } from '@/lib/constants';

export default function ClientProjectViewer() {
  const projectId = window.location.pathname.split('/').pop();
  const [search, setSearch] = useState('');

  const { data: projectResults = [] } = useQuery({ queryKey: ['portal-project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: segments = [] } = useQuery({ queryKey: ['portal-segments', projectId], queryFn: () => base44.entities.StreetSegment.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: media = [] } = useQuery({ queryKey: ['portal-media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: markers = [] } = useQuery({ queryKey: ['portal-markers', projectId], queryFn: () => base44.entities.MediaMarker.filter({ project_id: projectId }), enabled: !!projectId });

  const project = projectResults[0];
  const publishedMedia = media.filter((item) => item.publish_to_client);
  const clientMarkers = markers.filter((marker) => marker.is_client_visible);
  const filteredSegments = segments.filter((segment) => `${segment.street_name} ${segment.from_intersection} ${segment.to_intersection}`.toLowerCase().includes(search.toLowerCase()));
  const segmentMap = Object.fromEntries(segments.map((segment) => [segment.id, segment]));
  const groupedMedia = useMemo(() => publishedMedia.reduce((accumulator, item) => {
    const key = item.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {}), [publishedMedia]);
  const groupedMarkers = useMemo(() => clientMarkers.reduce((accumulator, marker) => {
    const mediaFile = publishedMedia.find((item) => item.id === marker.media_file_id);
    const key = mediaFile?.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push({ marker, mediaFile });
    return accumulator;
  }, {}), [clientMarkers, publishedMedia]);

  if (!project) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const MEDIA_ICONS = { photo: Image, video: Video, video_360: Video, thumbnail: Image, preview_clip: Video, document: File, export: File };

  return (
    <div className="space-y-6">
      <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={`${project.municipality || ''} ${project.state || ''}`} />

      <Card>
        <CardContent className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Project summary</p>
            <p className="text-sm text-muted-foreground leading-6">{project.client_portal_summary || project.client_visible_notes || 'This viewer contains the published documentation package approved for client review.'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge>{segments.length} segments</Badge>
            <Badge variant="outline">{publishedMedia.length} published media files</Badge>
            <Badge variant="outline">{clientMarkers.length} client-visible markers</Badge>
          </div>
        </CardContent>
      </Card>

      <OperatingGuide
        title="How To Use This Project Viewer"
        description="This client-facing view is organized to help you browse documented areas, open media, and review approved reference markers without exposing internal production notes."
        sections={[
          { heading: 'Purpose', body: 'Use this viewer to review the published site-documentation package for a project in a structured, segment-based format.' },
          { heading: 'Who Uses This', body: 'Client stakeholders, project reviewers, and authorized partner teams should use this view when they need approved documentation outputs.' },
          { heading: 'When To Use It', body: 'Use this page after CCG has completed internal review and published materials for client access.' },
          { heading: 'How It Works', body: 'Browse by segment to understand location coverage, switch to media to inspect published files, and use markers to jump to notable reference points described in client-safe language.' },
          { heading: 'Required Fields', body: 'Published records include only approved client-facing fields such as titles, summaries, view types, and curated notes.' },
          { heading: 'Client Visibility Rules', body: 'Internal-only notes, QA comments, and operational guidance are intentionally excluded from this viewer.' },
          { heading: 'Related Next Steps', body: 'If you need clarifications or additional coverage not shown here, contact your CCG project representative for the next update cycle.' },
        ]}
      />

      <WorkflowStepsPanel title="Suggested Client Workflow" steps={[
        { title: 'Start with segments', description: 'Identify the street or segment you need so the rest of the viewer stays grounded in project geography.' },
        { title: 'Open the relevant media', description: 'Review the media card details to understand view type, file type, and any approved client-facing notes.' },
        { title: 'Use markers as reference points', description: 'Markers identify important locations or moments that have already been reviewed and approved for client viewing.' },
      ]} />

      <div className="relative max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search streets, intersections, or landmarks" className="pl-9" /></div>

      <Tabs defaultValue="segments">
        <TabsList className="mb-4"><TabsTrigger value="segments">Segments</TabsTrigger><TabsTrigger value="media">Media</TabsTrigger><TabsTrigger value="markers">Markers</TabsTrigger></TabsList>

        <TabsContent value="segments">
          {filteredSegments.length === 0 ? <EmptyState icon={MapPin} title="No matching segments" description="Try a different search term or wait for additional published segments." /> : <div className="grid gap-4">{filteredSegments.map((segment) => (
            <Card key={segment.id}><CardContent className="p-4"><div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-semibold">{segment.street_name} {segment.segment_name ? `— ${segment.segment_name}` : ''}</p><p className="text-xs text-muted-foreground">{segment.from_intersection || '?'} to {segment.to_intersection || '?'} · {SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}</p>{segment.client_visible_notes && <p className="text-sm text-muted-foreground mt-2 leading-6">{segment.client_visible_notes}</p>}</div></div></CardContent></Card>
          ))}</div>}
        </TabsContent>

        <TabsContent value="media">
          {publishedMedia.length === 0 ? <EmptyState icon={FileVideo} title="No published media yet" description="Published media files will appear here after internal review and release." /> : <div className="space-y-4">{Object.entries(groupedMedia).map(([segmentId, items]) => (
            <Card key={segmentId}><CardHeader className="pb-3"><CardTitle className="text-base">{segmentMap[segmentId]?.street_name || 'General project media'}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{items.map((item) => { const MediaIcon = MEDIA_ICONS[item.media_type] || File; return <div key={item.id} className="rounded-lg border p-4"><div className="flex items-start gap-3"><div className="w-14 h-14 rounded bg-muted flex items-center justify-center shrink-0">{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className="w-14 h-14 rounded object-cover" /> : <MediaIcon className="w-5 h-5 text-muted-foreground" />}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{item.media_title}</p><p className="text-xs text-muted-foreground">{VIEW_TYPE_LABELS[item.view_type] || item.view_type} · {item.media_type}</p><p className="text-sm text-muted-foreground mt-2 leading-6">{item.client_visible_notes || 'Published for client reference.'}</p>{item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-block mt-2">Open published file →</a>}</div></div></div>; })}</CardContent></Card>
          ))}</div>}
        </TabsContent>

        <TabsContent value="markers">
          {clientMarkers.length === 0 ? <EmptyState icon={Bookmark} title="No client-visible markers" description="Approved markers will appear here when they are ready for client viewing." /> : <div className="space-y-4">{Object.entries(groupedMarkers).map(([segmentId, items]) => (
            <Card key={segmentId}><CardHeader className="pb-3"><CardTitle className="text-base">{segmentMap[segmentId]?.street_name || 'General markers'}</CardTitle></CardHeader><CardContent className="space-y-3">{items.map(({ marker, mediaFile }) => (
              <div key={marker.id} className="rounded-lg border p-4"><div className="flex items-start gap-3"><Bookmark className="w-4 h-4 text-primary mt-1" /><div><p className="text-sm font-medium">{marker.marker_label}</p><p className="text-xs text-muted-foreground">{MARKER_TYPE_LABELS[marker.marker_type] || marker.marker_type}{mediaFile ? ` · ${mediaFile.media_title}` : ''}{marker.timestamp_seconds !== undefined ? ` · ${String(Math.floor(marker.timestamp_seconds / 60)).padStart(2, '0')}:${String(Math.floor(marker.timestamp_seconds % 60)).padStart(2, '0')}` : ''}</p><p className="text-sm text-muted-foreground mt-2 leading-6">{marker.client_visible_notes || 'Approved marker reference.'}</p></div></div></div>
            ))}</CardContent></Card>
          ))}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
