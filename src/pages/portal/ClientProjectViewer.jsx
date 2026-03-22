import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock3, FileVideo, Search } from 'lucide-react';

export default function ClientProjectViewer() {
  const projectId = window.location.pathname.split('/').pop();
  const [search, setSearch] = useState('');
  const { data: projectResults = [] } = useQuery({ queryKey: ['portal-project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['portal-media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId, publish_to_client: true }), enabled: !!projectId });
  const { data: timelineItems = [] } = useQuery({ queryKey: ['portal-timeline', projectId], queryFn: () => base44.entities.TimelineIndexItem.filter({ project_id: projectId, publish_to_client: true }), enabled: !!projectId });
  const project = projectResults[0];

  const filteredTimeline = useMemo(() => timelineItems.filter((item) => [item.timeline_title, item.timeline_summary, item.search_text].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [timelineItems, search]);
  const filteredMedia = useMemo(() => mediaFiles.filter((item) => [item.media_title, item.client_visible_notes].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [mediaFiles, search]);

  if (!project) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>;

  return (
    <div className="space-y-6">
      <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={project.client_portal_summary || 'Published project documentation package.'} />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.client_project_viewer.title, sections: PAGE_GUIDANCE.client_project_viewer.sections }} />
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search timeline or media" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> Published timeline</CardTitle></CardHeader><CardContent className="space-y-3">{filteredTimeline.length === 0 ? <EmptyState icon={Clock3} title="No published timeline matches" description="Try a different search or wait for more published indexing." /> : filteredTimeline.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="text-sm font-medium">{item.timeline_title || 'Untitled timeline item'}</p><p className="mt-1 text-sm text-muted-foreground">{item.timeline_summary || item.search_text || 'No summary available.'}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileVideo className="h-4 w-4 text-primary" /> Published media</CardTitle></CardHeader><CardContent className="space-y-3">{filteredMedia.length === 0 ? <EmptyState icon={FileVideo} title="No published media matches" description="Try a different search or wait for additional published files." /> : filteredMedia.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="text-sm font-medium">{item.media_title}</p><p className="mt-1 text-sm text-muted-foreground">{item.client_visible_notes || 'Published for client reference.'}</p>{item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">Open file →</a>}</div>)}</CardContent></Card>
      </div>
    </div>
  );
}
