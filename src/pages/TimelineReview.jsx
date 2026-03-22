import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { formatTimestamp } from '@/lib/displayUtils';
import { Search, Clock3, FileVideo, MapPinned, CheckCircle2, XCircle } from 'lucide-react';

const emptyEdit = {
  id: '',
  nearest_intersection: '',
  nearest_address: '',
  nearby_place_name: '',
  search_text: '',
};

export default function TimelineReview() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [editForm, setEditForm] = useState(emptyEdit);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: timelineItems = [], isLoading } = useQuery({
    queryKey: ['timeline-index-entries'],
    queryFn: () => base44.entities.TimelineIndexEntry.list('-created_date', 300),
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media-files'], queryFn: () => base44.entities.MediaFile.list('-created_date', 200) });
  const { data: cutPoints = [] } = useQuery({ queryKey: ['suggested-cut-points'], queryFn: () => base44.entities.SuggestedCutPoint.list('-created_date', 300) });

  const updateTimelineMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineIndexEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-index-entries'] });
      setShowEditDialog(false);
      setEditForm(emptyEdit);
    },
  });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const mediaMap = Object.fromEntries(mediaFiles.map((media) => [media.id, media]));
  const cutPointsByMedia = cutPoints.reduce((accumulator, cutPoint) => {
    if (!cutPoint.media_file_id) return accumulator;
    accumulator[cutPoint.media_file_id] = accumulator[cutPoint.media_file_id] || [];
    accumulator[cutPoint.media_file_id].push(cutPoint);
    return accumulator;
  }, {});

  const filteredItems = useMemo(() => timelineItems.filter((item) => {
    const matchesProject = projectFilter === 'all' || item.project_id === projectFilter;
    const haystack = [
      item.nearest_road,
      item.nearest_intersection,
      item.nearest_address,
      item.nearby_place_name,
      item.search_text,
      projectMap[item.project_id]?.project_name,
      sessionMap[item.capture_session_id]?.session_name,
      mediaMap[item.media_file_id]?.media_title,
    ].filter(Boolean).join(' ').toLowerCase();
    return matchesProject && haystack.includes(search.toLowerCase());
  }), [timelineItems, projectFilter, search, projectMap, sessionMap, mediaMap]);

  const openEditor = (item) => {
    setEditForm({
      id: item.id,
      nearest_intersection: item.nearest_intersection || '',
      nearest_address: item.nearest_address || '',
      nearby_place_name: item.nearby_place_name || '',
      search_text: item.search_text || '',
    });
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline Review"
        description="Review auto-generated timeline metadata, confirm likely locations, clean the search text, and accept or reject suggested cut context."
        helpText="This page is now centered on the search timeline built from paired video plus GPX/FIT tracks."
      />

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.timeline_review.title, sections: PAGE_GUIDANCE.timeline_review.sections }} />

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search intersections, addresses, places, sessions, or search text" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline rows</p><p className="mt-2 text-2xl font-semibold">{filteredItems.length}</p><p className="mt-2 text-sm text-muted-foreground">Indexed moments in the current review slice.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Likely intersections</p><p className="mt-2 text-2xl font-semibold">{filteredItems.filter((item) => item.nearest_intersection).length}</p><p className="mt-2 text-sm text-muted-foreground">Items with a likely cross street or junction.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Nearby places</p><p className="mt-2 text-2xl font-semibold">{filteredItems.filter((item) => item.nearby_place_name).length}</p><p className="mt-2 text-sm text-muted-foreground">Items enriched with business, park, or landmark context.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested cuts</p><p className="mt-2 text-2xl font-semibold">{filteredItems.reduce((total, item) => total + (cutPointsByMedia[item.media_file_id]?.length || 0), 0)}</p><p className="mt-2 text-sm text-muted-foreground">Cut points connected to the visible timeline rows.</p></CardContent></Card>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredItems.length === 0 ? (
        <EmptyState icon={Clock3} title="No timeline items found" description="Pair video with GPX/FIT tracks and run indexing to populate the searchable timeline." />
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => {
            const mediaCutPoints = cutPointsByMedia[item.media_file_id] || [];
            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{item.nearest_intersection || item.nearest_address || item.nearby_place_name || 'Untitled timeline item'}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{projectMap[item.project_id]?.project_name || 'No project'} · {sessionMap[item.capture_session_id]?.session_name || 'No session'}</p>
                    </div>
                    <StatusBadge status={item.review_status || 'needs_review'} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3">
                      <div className="rounded-lg border p-3 space-y-2">
                        <p><span className="font-medium text-foreground">Likely intersection:</span> {item.nearest_intersection || 'Not inferred'}</p>
                        <p><span className="font-medium text-foreground">Likely address:</span> {item.nearest_address || item.address_range || 'Not inferred'}</p>
                        <p><span className="font-medium text-foreground">Nearby place:</span> {item.nearby_place_name || 'Not inferred'}</p>
                        <p><span className="font-medium text-foreground">Search text:</span> {item.search_text || 'No search text stored yet.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border px-2 py-1">Timestamp: {formatTimestamp(item.start_seconds)}</span>
                        {item.end_seconds !== null && item.end_seconds !== undefined && <span className="rounded-full border px-2 py-1">End: {formatTimestamp(item.end_seconds)}</span>}
                        {item.media_file_id && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><FileVideo className="h-3 w-3" /> {mediaMap[item.media_file_id]?.media_title || 'Media linked'}</span>}
                        {item.gps_track_id && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><MapPinned className="h-3 w-3" /> Track paired</span>}
                        <span className="rounded-full border px-2 py-1">Confidence: {item.confidence ?? '—'}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 space-y-3">
                      <p className="font-medium text-foreground">Suggested cut points</p>
                      {mediaCutPoints.length === 0 ? <p className="text-xs text-muted-foreground">No cut suggestions linked to this media item yet.</p> : mediaCutPoints.slice(0, 4).map((cutPoint) => <div key={cutPoint.id} className="rounded-lg border p-2"><p className="text-xs font-medium text-foreground">{formatTimestamp(cutPoint.timestamp_seconds)} · {cutPoint.reason}</p><p className="mt-1 text-xs text-muted-foreground">{cutPoint.related_location_label || 'No location label'}</p></div>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button variant="outline" onClick={() => openEditor(item)}>Edit metadata</Button>
                    <Button variant="secondary" className="gap-2" onClick={() => updateTimelineMut.mutate({ id: item.id, data: { review_status: 'confirmed', client_visible: true } })}><CheckCircle2 className="h-4 w-4" /> Confirm</Button>
                    <Button variant="destructive" className="gap-2" onClick={() => updateTimelineMut.mutate({ id: item.id, data: { review_status: 'rejected', client_visible: false } })}><XCircle className="h-4 w-4" /> Reject</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditForm(emptyEdit); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit timeline metadata</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Likely intersection</Label><Input value={editForm.nearest_intersection} onChange={(event) => setEditForm((current) => ({ ...current, nearest_intersection: event.target.value }))} /></div>
            <div><Label>Likely address reference</Label><Input value={editForm.nearest_address} onChange={(event) => setEditForm((current) => ({ ...current, nearest_address: event.target.value }))} /></div>
            <div><Label>Nearby place</Label><Input value={editForm.nearby_place_name} onChange={(event) => setEditForm((current) => ({ ...current, nearby_place_name: event.target.value }))} /></div>
            <div><Label>Search text</Label><Input value={editForm.search_text} onChange={(event) => setEditForm((current) => ({ ...current, search_text: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditForm(emptyEdit); }}>Cancel</Button>
            <Button onClick={() => updateTimelineMut.mutate({ id: editForm.id, data: { ...editForm, review_status: 'edited' } })} disabled={!editForm.id}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
