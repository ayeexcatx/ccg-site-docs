import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Search, Clock3, FileVideo, MapPinned } from 'lucide-react';

export default function TimelineReview() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const { data: timelineItems = [], isLoading } = useQuery({
    queryKey: ['timeline-index-items'],
    queryFn: () => base44.entities.TimelineIndexItem.list('-created_date', 300),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['capture-sessions'],
    queryFn: () => base44.entities.CaptureSession.list('-created_date', 200),
  });
  const { data: mediaFiles = [] } = useQuery({
    queryKey: ['media-files'],
    queryFn: () => base44.entities.MediaFile.list('-created_date', 200),
  });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const mediaMap = Object.fromEntries(mediaFiles.map((media) => [media.id, media]));

  const filteredItems = useMemo(() => timelineItems.filter((item) => {
    const matchesProject = projectFilter === 'all' || item.project_id === projectFilter;
    const haystack = [
      item.timeline_title,
      item.search_text,
      item.timeline_summary,
      projectMap[item.project_id]?.project_name,
      sessionMap[item.capture_session_id]?.session_name,
      mediaMap[item.media_file_id]?.media_title,
    ].filter(Boolean).join(' ').toLowerCase();
    return matchesProject && haystack.includes(search.toLowerCase());
  }), [timelineItems, projectFilter, search, projectMap, sessionMap, mediaMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline Review"
        description="Review the indexed timeline that ties session entries, GPS-track pairing, and media together into one searchable sequence."
        helpText="This replaces the old checkpoint-first review model with a session-first timeline QA flow."
      />

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.timeline_review.title, sections: PAGE_GUIDANCE.timeline_review.sections }} />

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search timeline titles, notes, media, or session text" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Indexed items</p><p className="mt-2 text-2xl font-semibold">{filteredItems.length}</p><p className="mt-2 text-sm text-muted-foreground">Timeline records in the current review slice.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">With media</p><p className="mt-2 text-2xl font-semibold">{filteredItems.filter((item) => item.media_file_id).length}</p><p className="mt-2 text-sm text-muted-foreground">Indexed moments already tied to a media file.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">With GPS track</p><p className="mt-2 text-2xl font-semibold">{filteredItems.filter((item) => item.gps_track_id).length}</p><p className="mt-2 text-sm text-muted-foreground">Records that include GPX or FIT pairing context.</p></CardContent></Card>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredItems.length === 0 ? (
        <EmptyState icon={Clock3} title="No timeline items found" description="Index capture session entries or pair media with GPX/FIT tracks to populate the searchable timeline." />
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.timeline_title || 'Untitled timeline item'}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {projectMap[item.project_id]?.project_name || 'No project'} · {sessionMap[item.capture_session_id]?.session_name || 'No session'}
                    </p>
                  </div>
                  <StatusBadge status={item.index_status || 'indexed'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{item.timeline_summary || item.search_text || 'No summary recorded.'}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.timeline_timestamp && <span className="rounded-full border px-2 py-1">Time: {item.timeline_timestamp}</span>}
                  {item.media_file_id && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><FileVideo className="h-3 w-3" /> {mediaMap[item.media_file_id]?.media_title || 'Media linked'}</span>}
                  {item.gps_track_id && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><MapPinned className="h-3 w-3" /> GPS track paired</span>}
                  {item.search_keywords && <span className="rounded-full border px-2 py-1">Keywords: {item.search_keywords}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
