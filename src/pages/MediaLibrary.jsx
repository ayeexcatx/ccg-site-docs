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
import { formatLabel, formatTimestamp } from '@/lib/displayUtils';
import { FileVideo, Plus, Search } from 'lucide-react';

const emptyMedia = {
  project_id: '',
  capture_session_id: '',
  media_type: 'video',
  media_title: '',
  original_filename: '',
  source_kind: 'native_upload',
  storage_mode: 'native_upload',
  processing_status: 'uploaded',
  publish_readiness: 'not_reviewed',
  publish_to_client: false,
  gps_track_id: '',
  track_pairing_status: 'unpaired',
  timeline_index_status: 'not_started',
  view_type: 'right_profile',
  pairing_notes: '',
};

const emptyTrack = {
  project_id: '',
  capture_session_id: '',
  track_name: '',
  source_type: 'gpx',
  original_filename: '',
  upload_status: 'uploaded',
  parsing_status: 'not_started',
  notes: '',
};

export default function MediaLibrary() {
  const [search, setSearch] = useState('');
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [mediaForm, setMediaForm] = useState(emptyMedia);
  const [trackForm, setTrackForm] = useState(emptyTrack);
  const queryClient = useQueryClient();

  const { data: mediaFiles = [], isLoading } = useQuery({ queryKey: ['media-files'], queryFn: () => base44.entities.MediaFile.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('recording_order', 200) });
  const { data: gpsTracks = [] } = useQuery({ queryKey: ['gps-tracks'], queryFn: () => base44.entities.GpsTrack.list('-created_date', 200) });
  const { data: syncs = [] } = useQuery({ queryKey: ['session-syncs'], queryFn: () => base44.entities.SessionSync.list('-created_date', 200) });
  const { data: cutPoints = [] } = useQuery({ queryKey: ['suggested-cut-points'], queryFn: () => base44.entities.SuggestedCutPoint.list('-created_date', 300) });

  const createMediaMut = useMutation({ mutationFn: (data) => base44.entities.MediaFile.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media-files'] }); setShowMediaForm(false); setMediaForm(emptyMedia); } });
  const createTrackMut = useMutation({ mutationFn: (data) => base44.entities.GpsTrack.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gps-tracks'] }); setShowTrackForm(false); setTrackForm(emptyTrack); } });
  const pairMediaMut = useMutation({ mutationFn: async ({ file, gpsTrackId }) => {
    await base44.entities.MediaFile.update(file.id, { gps_track_id: gpsTrackId, track_pairing_status: gpsTrackId ? 'paired' : 'unpaired' });
    if (gpsTrackId) {
      await base44.entities.SessionSync.create({
        project_id: file.project_id,
        capture_session_id: file.capture_session_id,
        media_file_id: file.id,
        gps_track_id: gpsTrackId,
        sync_mode: 'device_clock',
      });
    }
  }, onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['media-files'] });
    queryClient.invalidateQueries({ queryKey: ['session-syncs'] });
  } });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const gpsMap = Object.fromEntries(gpsTracks.map((track) => [track.id, track]));
  const syncByMedia = syncs.reduce((accumulator, sync) => {
    if (!sync.media_file_id) return accumulator;
    accumulator[sync.media_file_id] = sync;
    return accumulator;
  }, {});
  const cutPointsByMedia = cutPoints.reduce((accumulator, cutPoint) => {
    if (!cutPoint.media_file_id) return accumulator;
    accumulator[cutPoint.media_file_id] = accumulator[cutPoint.media_file_id] || [];
    accumulator[cutPoint.media_file_id].push(cutPoint);
    return accumulator;
  }, {});

  const filtered = useMemo(() => mediaFiles.filter((file) => [
    file.media_title,
    file.original_filename,
    projectMap[file.project_id],
    sessionMap[file.capture_session_id]?.session_name,
    gpsMap[file.gps_track_id]?.track_name,
  ].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [mediaFiles, search, projectMap, sessionMap, gpsMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="Media Library" description="Upload video and GPX/FIT files, pair each asset to the right session, and track sync, indexing, and suggested cut status in one place." helpText="The pairing workflow is now session-first: connect media and tracks directly to the generated session that created them.">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowTrackForm(true)}><Plus className="h-4 w-4" /> Add GPX/FIT</Button>
          <Button size="sm" className="gap-2" onClick={() => setShowMediaForm(true)}><Plus className="h-4 w-4" /> Add Video</Button>
        </div>
      </PageHeader>
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.media_library.title, sections: PAGE_GUIDANCE.media_library.sections }} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Videos uploaded</p><p className="mt-2 text-2xl font-semibold">{mediaFiles.filter((file) => file.media_type === 'video' || file.media_type === 'video_360').length}</p><p className="mt-2 text-sm text-muted-foreground">Session-linked field video in the library.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPX / FIT uploaded</p><p className="mt-2 text-2xl font-semibold">{gpsTracks.length}</p><p className="mt-2 text-sm text-muted-foreground">Track files available for pairing and indexing.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Paired assets</p><p className="mt-2 text-2xl font-semibold">{mediaFiles.filter((file) => file.gps_track_id || file.track_pairing_status === 'paired').length}</p><p className="mt-2 text-sm text-muted-foreground">Video files already paired to GPX/FIT session tracks.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested cuts</p><p className="mt-2 text-2xl font-semibold">{cutPoints.length}</p><p className="mt-2 text-sm text-muted-foreground">Auto-detected moments ready for timeline review.</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search media, sessions, projects, or tracks" /></div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={FileVideo} title="No media in the library" description="Add uploaded video first, then add GPX/FIT tracks and pair them to sessions." /> : (
        <div className="grid gap-4">
          {filtered.map((file) => {
            const pairedTrack = gpsMap[file.gps_track_id];
            const sync = syncByMedia[file.id];
            const session = sessionMap[file.capture_session_id];
            const mediaCutPoints = cutPointsByMedia[file.id] || [];
            const compatibleTracks = gpsTracks.filter((track) => !file.capture_session_id || track.capture_session_id === file.capture_session_id);
            return (
              <Card key={file.id}>
                <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{file.media_title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{projectMap[file.project_id] || 'No project'} · {session?.session_name || 'No session'} · {formatLabel(file.view_type || file.media_type)}</p></div><div className="flex flex-wrap gap-2"><StatusBadge status={file.processing_status} /><StatusBadge status={file.track_pairing_status || 'unpaired'} /><StatusBadge status={file.timeline_index_status || 'not_started'} /></div></div></CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-3">
                      <div className="rounded-lg border p-3">
                        <p><span className="font-medium text-foreground">Filename:</span> {file.original_filename || 'No source filename provided.'}</p>
                        <p><span className="font-medium text-foreground">Track pairing:</span> {pairedTrack ? `${pairedTrack.track_name || pairedTrack.original_filename} (${formatLabel(pairedTrack.source_type)})` : 'Not paired yet'}</p>
                        <p><span className="font-medium text-foreground">Sync preview:</span> {sync ? `${formatLabel(sync.sync_mode)} · offset ${sync.offset_seconds || 0}s` : 'No sync record yet'}</p>
                        <p><span className="font-medium text-foreground">Indexing:</span> {formatLabel(file.timeline_index_status || 'not_started')}</p>
                      </div>
                      {mediaCutPoints.length > 0 && <div className="rounded-lg border p-3"><p className="mb-2 font-medium text-foreground">Suggested cut points</p><div className="flex flex-wrap gap-2">{mediaCutPoints.slice(0, 5).map((cutPoint) => <span key={cutPoint.id} className="rounded-full border px-2 py-1 text-xs">{formatTimestamp(cutPoint.timestamp_seconds)} · {cutPoint.related_location_label || cutPoint.reason}</span>)}</div></div>}
                    </div>
                    <div className="rounded-lg border p-3 space-y-3">
                      <div>
                        <Label>Pair track to session</Label>
                        <Select value={file.gps_track_id || 'none'} onValueChange={(value) => pairMediaMut.mutate({ file, gpsTrackId: value === 'none' ? '' : value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No GPX/FIT track</SelectItem>
                            {compatibleTracks.map((track) => <SelectItem key={track.id} value={track.id}>{track.track_name || track.original_filename}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Status preview</p>
                        <p>{pairedTrack ? 'Paired and ready for sync review.' : 'Waiting for GPX/FIT upload or manual selection.'}</p>
                        <p className="mt-2">Suggested cuts: {mediaCutPoints.length}</p>
                        {sync?.video_start_time && <p className="mt-2">Video start: {new Date(sync.video_start_time).toLocaleString()}</p>}
                      </div>
                    </div>
                  </div>
                  {file.pairing_notes && <p>{file.pairing_notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showMediaForm} onOpenChange={(open) => { if (!open) { setShowMediaForm(false); setMediaForm(emptyMedia); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New media file</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Project *</Label><Select value={mediaForm.project_id || 'none'} onValueChange={(value) => setMediaForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div><div><Label>Session *</Label><Select value={mediaForm.capture_session_id || 'none'} onValueChange={(value) => setMediaForm((current) => ({ ...current, capture_session_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.filter((session) => !mediaForm.project_id || session.project_id === mediaForm.project_id).map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Media title *</Label><Input value={mediaForm.media_title} onChange={(event) => setMediaForm((current) => ({ ...current, media_title: event.target.value }))} /></div><div><Label>Original filename</Label><Input value={mediaForm.original_filename} onChange={(event) => setMediaForm((current) => ({ ...current, original_filename: event.target.value }))} /></div></div>
            <div className="grid gap-3 md:grid-cols-3"><div><Label>Media type</Label><Select value={mediaForm.media_type} onValueChange={(value) => setMediaForm((current) => ({ ...current, media_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['video', 'video_360', 'photo', 'preview_clip', 'document'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div><div><Label>View type</Label><Select value={mediaForm.view_type} onValueChange={(value) => setMediaForm((current) => ({ ...current, view_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['right_profile', 'left_profile', 'curb_line_edge_of_pavement', 'cross_section', '360_walk', 'custom'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div><div><Label>Pairing status</Label><Select value={mediaForm.track_pairing_status} onValueChange={(value) => setMediaForm((current) => ({ ...current, track_pairing_status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['unpaired', 'candidate_match', 'paired', 'needs_review'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div></div>
            <div><Label>Pairing notes</Label><Input value={mediaForm.pairing_notes} onChange={(event) => setMediaForm((current) => ({ ...current, pairing_notes: event.target.value }))} placeholder="Example: Same run as Main Street Right Profile, Garmin watch started 6 seconds early." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowMediaForm(false); setMediaForm(emptyMedia); }}>Cancel</Button><Button onClick={() => createMediaMut.mutate(mediaForm)} disabled={!mediaForm.project_id || !mediaForm.capture_session_id || !mediaForm.media_title}>Save Media</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrackForm} onOpenChange={(open) => { if (!open) { setShowTrackForm(false); setTrackForm(emptyTrack); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New GPX / FIT track</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Project *</Label><Select value={trackForm.project_id || 'none'} onValueChange={(value) => setTrackForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div><div><Label>Session *</Label><Select value={trackForm.capture_session_id || 'none'} onValueChange={(value) => setTrackForm((current) => ({ ...current, capture_session_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.filter((session) => !trackForm.project_id || session.project_id === trackForm.project_id).map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid gap-3 md:grid-cols-3"><div><Label>Track name</Label><Input value={trackForm.track_name} onChange={(event) => setTrackForm((current) => ({ ...current, track_name: event.target.value }))} placeholder="Main Street Right Profile GPX" /></div><div><Label>Source type</Label><Select value={trackForm.source_type} onValueChange={(value) => setTrackForm((current) => ({ ...current, source_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['gpx', 'fit', 'geojson', 'device_sync', 'manual'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div><div><Label>Filename *</Label><Input value={trackForm.original_filename} onChange={(event) => setTrackForm((current) => ({ ...current, original_filename: event.target.value }))} /></div></div>
            <div><Label>Notes</Label><Input value={trackForm.notes} onChange={(event) => setTrackForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Example: Exported from watch after AM field run." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowTrackForm(false); setTrackForm(emptyTrack); }}>Cancel</Button><Button onClick={() => createTrackMut.mutate(trackForm)} disabled={!trackForm.project_id || !trackForm.capture_session_id || !trackForm.original_filename}>Save Track</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
