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
import { FileVideo, Plus, Search } from 'lucide-react';

const emptyMedia = {
  project_id: '', capture_session_id: '', media_type: 'video', media_title: '', original_filename: '', source_kind: 'native_upload', storage_mode: 'native_upload', file_url: '', preview_url: '', thumbnail_url: '', processing_status: 'uploaded', publish_readiness: 'not_reviewed', publish_to_client: false, gps_track_id: '', track_pairing_status: 'unpaired', pairing_notes: '',
};

export default function MediaLibrary() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMedia);
  const queryClient = useQueryClient();

  const { data: mediaFiles = [], isLoading } = useQuery({ queryKey: ['media-files'], queryFn: () => base44.entities.MediaFile.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: gpsTracks = [] } = useQuery({ queryKey: ['gps-tracks'], queryFn: () => base44.entities.GpsTrack.list('-created_date', 200) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.MediaFile.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media-files'] }); setShowForm(false); setForm(emptyMedia); } });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session.session_name]));
  const gpsMap = Object.fromEntries(gpsTracks.map((track) => [track.id, track.track_name]));
  const filtered = useMemo(() => mediaFiles.filter((file) => [file.media_title, file.original_filename, projectMap[file.project_id], sessionMap[file.capture_session_id], gpsMap[file.gps_track_id]].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [mediaFiles, search, projectMap, sessionMap, gpsMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="Media Library" description="Register uploads, attach them to sessions, and pair video with GPX or FIT tracks." helpText="The GPS / track pairing flow now lives directly inside Media Library so uploads, sessions, and timeline indexing stay connected.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Media</Button>
      </PageHeader>
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.media_library.title, sections: PAGE_GUIDANCE.media_library.sections }} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Uploaded media</p><p className="mt-2 text-2xl font-semibold">{mediaFiles.length}</p><p className="mt-2 text-sm text-muted-foreground">All registered files in the library.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Paired with GPS</p><p className="mt-2 text-2xl font-semibold">{mediaFiles.filter((file) => file.gps_track_id || file.track_pairing_status === 'paired').length}</p><p className="mt-2 text-sm text-muted-foreground">Video or media already linked to GPX/FIT context.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Ready for publish</p><p className="mt-2 text-2xl font-semibold">{mediaFiles.filter((file) => ['ready_for_publish', 'published'].includes(file.publish_readiness)).length}</p><p className="mt-2 text-sm text-muted-foreground">Files that cleared internal media prep.</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search media, sessions, projects, or tracks" /></div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={FileVideo} title="No media in the library" description="Add uploaded files and pair them with sessions plus GPX/FIT tracks." /> : (
        <div className="grid gap-4">
          {filtered.map((file) => (
            <Card key={file.id}>
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{file.media_title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{projectMap[file.project_id] || 'No project'} · {sessionMap[file.capture_session_id] || 'No session'}</p></div><div className="flex flex-wrap gap-2"><StatusBadge status={file.processing_status} /><StatusBadge status={file.track_pairing_status || 'unpaired'} /></div></div></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{file.original_filename || 'No source filename provided.'}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border px-2 py-1">Type: {file.media_type}</span>
                  <span className="rounded-full border px-2 py-1">Track: {gpsMap[file.gps_track_id] || 'Not paired'}</span>
                  <span className="rounded-full border px-2 py-1">Publish: {file.publish_readiness}</span>
                </div>
                {file.pairing_notes && <p>{file.pairing_notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyMedia); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New media file</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Project *</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div><div><Label>Session</Label><Select value={form.capture_session_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, capture_session_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Media title *</Label><Input value={form.media_title} onChange={(event) => setForm((current) => ({ ...current, media_title: event.target.value }))} /></div><div><Label>Original filename</Label><Input value={form.original_filename} onChange={(event) => setForm((current) => ({ ...current, original_filename: event.target.value }))} /></div></div>
            <div className="grid gap-3 md:grid-cols-3"><div><Label>Media type</Label><Select value={form.media_type} onValueChange={(value) => setForm((current) => ({ ...current, media_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['photo', 'video', 'video_360', 'thumbnail', 'preview_clip', 'document', 'export'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div><div><Label>Track pairing</Label><Select value={form.track_pairing_status} onValueChange={(value) => setForm((current) => ({ ...current, track_pairing_status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['unpaired', 'candidate_match', 'paired', 'needs_review'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div><div><Label>GPX / FIT track</Label><Select value={form.gps_track_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, gps_track_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No track</SelectItem>{gpsTracks.map((track) => <SelectItem key={track.id} value={track.id}>{track.track_name}</SelectItem>)}</SelectContent></Select></div></div>
            <div><Label>Pairing notes</Label><Input value={form.pairing_notes} onChange={(event) => setForm((current) => ({ ...current, pairing_notes: event.target.value }))} placeholder="How this file was paired with the GPS track" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyMedia); }}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={!form.project_id || !form.media_title}>Save Media</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
