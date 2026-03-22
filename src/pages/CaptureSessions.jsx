import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE, REFERENCE_CODE_HELPER } from '@/lib/workflowGuidance';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatLabel } from '@/lib/displayUtils';
import { Badge } from '@/components/ui/badge';
import { Camera, Plus, Search } from 'lucide-react';

const emptySession = {
  project_id: '',
  capture_session_entry_id: '',
  session_name: '',
  session_code: '',
  session_status: 'planned',
  capture_method: 'video',
  default_view_type: 'right_profile',
  recording_order: 0,
  session_area_description: '',
  weather_notes: '',
  field_notes_internal: '',
  field_notes_client_visible: '',
  gps_track_expected: true,
  gps_sync_status: 'not_started',
  timeline_index_status: 'not_started',
  qa_status: 'not_reviewed',
  video_upload_status: 'not_uploaded',
  session_handoff_status: 'not_started',
};

export default function CaptureSessions() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySession);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('recording_order', 300) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: entries = [] } = useQuery({ queryKey: ['capture-session-entries'], queryFn: () => base44.entities.CaptureSessionEntry.list('recording_order', 200) });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media-files'], queryFn: () => base44.entities.MediaFile.list('-created_date', 300) });
  const { data: tracks = [] } = useQuery({ queryKey: ['gps-tracks'], queryFn: () => base44.entities.GpsTrack.list('-created_date', 300) });
  const { data: timelineEntries = [] } = useQuery({ queryKey: ['timeline-index-entries'], queryFn: () => base44.entities.TimelineIndexEntry.list('-created_date', 400) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.CaptureSession.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['capture-sessions'] }); setShowForm(false); setForm(emptySession); } });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const entryMap = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  const mediaBySession = mediaFiles.reduce((accumulator, file) => {
    if (!file.capture_session_id) return accumulator;
    accumulator[file.capture_session_id] = accumulator[file.capture_session_id] || [];
    accumulator[file.capture_session_id].push(file);
    return accumulator;
  }, {});
  const pairedTrackCountBySession = tracks.reduce((accumulator, track) => {
    if (!track.capture_session_id) return accumulator;
    accumulator[track.capture_session_id] = (accumulator[track.capture_session_id] || 0) + 1;
    return accumulator;
  }, {});
  const indexedCountBySession = timelineEntries.reduce((accumulator, entry) => {
    if (!entry.capture_session_id) return accumulator;
    accumulator[entry.capture_session_id] = (accumulator[entry.capture_session_id] || 0) + 1;
    return accumulator;
  }, {});

  const filtered = useMemo(() => sessions.filter((session) => {
    const matchesProject = projectFilter === 'all' || session.project_id === projectFilter;
    const haystack = [
      session.session_name,
      session.session_code,
      projectMap[session.project_id],
      entryMap[session.capture_session_entry_id]?.entry_name,
      session.default_view_type,
      session.capture_method,
      session.session_area_description,
    ].filter(Boolean).join(' ').toLowerCase();
    return matchesProject && haystack.includes(search.toLowerCase());
  }), [sessions, projectFilter, search, projectMap, entryMap]);

  const sessionsWithVideo = sessions.filter((session) => (mediaBySession[session.id] || []).some((file) => ['video', 'video_360'].includes(file.media_type))).length;
  const sessionsWithTracks = sessions.filter((session) => (pairedTrackCountBySession[session.id] || 0) > 0 || session.gps_sync_status === 'synced').length;
  const indexedSessions = sessions.filter((session) => (indexedCountBySession[session.id] || 0) > 0 || session.timeline_index_status === 'indexed').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Capture Sessions" description="Track the generated session stack by order, recording status, video upload, GPX/FIT pairing, and timeline indexing." helpText="This page is now about generated sessions, not manual segment planning.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Session</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.capture_sessions.title, sections: PAGE_GUIDANCE.capture_sessions.sections }} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions</p><p className="mt-2 text-2xl font-semibold">{sessions.length}</p><p className="mt-2 text-sm text-muted-foreground">Generated and manual sessions in the active stack.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Video uploaded</p><p className="mt-2 text-2xl font-semibold">{sessionsWithVideo}</p><p className="mt-2 text-sm text-muted-foreground">Sessions with linked video ready for pairing or review.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPX / FIT paired</p><p className="mt-2 text-2xl font-semibold">{sessionsWithTracks}</p><p className="mt-2 text-sm text-muted-foreground">Sessions with a paired track or synced GPS status.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline indexed</p><p className="mt-2 text-2xl font-semibold">{indexedSessions}</p><p className="mt-2 text-sm text-muted-foreground">Sessions with searchable timeline output.</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search sessions, entries, views, or codes" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : filtered.length === 0 ? <EmptyState icon={Camera} title="No capture sessions yet" description="Generate sessions from the entry page or create a manual one if you need a special pass." /> : (
        <div className="grid gap-3">
          {filtered.map((session) => {
            const media = mediaBySession[session.id] || [];
            const videos = media.filter((file) => ['video', 'video_360'].includes(file.media_type));
            const videoReady = videos.length > 0 || session.video_upload_status === 'uploaded' || session.video_upload_status === 'linked';
            const trackReady = (pairedTrackCountBySession[session.id] || 0) > 0 || session.gps_sync_status === 'synced';
            const timelineReady = (indexedCountBySession[session.id] || 0) > 0 || session.timeline_index_status === 'indexed';
            return (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{session.recording_order || 0}. {session.session_name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{projectMap[session.project_id] || 'No project'} · {formatLabel(session.default_view_type)} · {entryMap[session.capture_session_entry_id]?.entry_name || 'Manual session'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end"><StatusBadge status={session.session_status} /><StatusBadge status={session.session_handoff_status || 'not_started'} /><StatusBadge status={session.qa_status} /></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Session order</p><p className="mt-1 font-medium text-foreground">{session.recording_order || 0}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Recording status</p><p className="mt-1 font-medium text-foreground">{formatLabel(session.session_status || 'planned')}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Video uploaded</p><p className="mt-1 font-medium text-foreground">{videoReady ? `${videos.length || 1} linked` : 'Not yet'}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPX / FIT paired</p><p className="mt-1 font-medium text-foreground">{trackReady ? 'Paired' : formatLabel(session.gps_sync_status || 'not_started')}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline indexing</p><p className="mt-1 font-medium text-foreground">{timelineReady ? `${indexedCountBySession[session.id] || 1} row(s)` : formatLabel(session.timeline_index_status || 'not_started')}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formatLabel(session.capture_method)}</Badge>
                    <Badge variant="outline">{session.session_code || 'No session code'}</Badge>
                    {session.gps_track_expected && <Badge variant="outline">GPS expected</Badge>}
                  </div>
                  <p>{session.session_area_description || 'No session area description yet.'}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptySession); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Capture Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Project *</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Generated from entry</Label><Select value={form.capture_session_entry_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, capture_session_entry_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Manual / not tied to an entry</SelectItem>{entries.filter((entry) => !form.project_id || entry.project_id === form.project_id).map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.entry_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Session name *</Label><Input value={form.session_name} onChange={(event) => setForm((current) => ({ ...current, session_name: event.target.value }))} /></div>
              <div><Label>Session code</Label><Input value={form.session_code} onChange={(event) => setForm((current) => ({ ...current, session_code: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">{REFERENCE_CODE_HELPER}</p></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Capture method</Label><Select value={form.capture_method} onValueChange={(value) => setForm((current) => ({ ...current, capture_method: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['photo', 'video', 'video_and_photo', 'video_360', 'mixed'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Default view type</Label><Select value={form.default_view_type} onValueChange={(value) => setForm((current) => ({ ...current, default_view_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['right_profile', 'left_profile', 'curb_line_edge_of_pavement', 'cross_section', '360_walk', 'reverse_view', 'custom'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Recording order</Label><Input type="number" value={form.recording_order} onChange={(event) => setForm((current) => ({ ...current, recording_order: Number(event.target.value || 0) }))} /></div>
            </div>
            <div><Label>Session area description</Label><Textarea value={form.session_area_description} onChange={(event) => setForm((current) => ({ ...current, session_area_description: event.target.value }))} placeholder="Example: Main Street eastbound curb line from Oak Ave to Elm Ave." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setForm(emptySession); }}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={!form.project_id || !form.session_name}>Create Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
