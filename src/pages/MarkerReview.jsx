import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { OperatingGuide, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { MARKER_TYPE_LABELS } from '@/lib/constants';
import { AlertCircle, Bookmark, CheckCircle, Clock, Pencil, Plus, Search } from 'lucide-react';

const CONFIDENCE_COLORS = {
  manual: 'bg-blue-100 text-blue-800',
  estimated: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  ai_suggested_future: 'bg-purple-100 text-purple-800',
};

const emptyMarker = {
  project_id: '', media_file_id: '', marker_type: 'intersection', marker_label: '', timestamp_seconds: 0,
  confidence_level: 'manual', validation_status: 'pending_review', internal_notes: '', client_visible_notes: '',
  checkpoint_reference: '', asset_location_reference: '', is_client_visible: true,
};

export default function MarkerReview() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMarker);
  const [filters, setFilters] = useState({ projectId: 'all', sessionId: 'all', mediaId: 'all', confidence: 'all', visibility: 'all', search: '' });
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('marker_review');

  const { data: markers = [], isLoading } = useQuery({ queryKey: ['markers'], queryFn: () => base44.entities.MediaMarker.list('-created_date', 200) });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media-files'], queryFn: () => base44.entities.MediaFile.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: checkpoints = [] } = useQuery({ queryKey: ['marker-checkpoints'], queryFn: () => base44.entities.RouteCheckpoint.list('sequence_order', 300) });
  const { data: assetLocations = [] } = useQuery({ queryKey: ['asset-locations'], queryFn: () => base44.entities.AssetLocation.list('-created_date', 300) });

  const createMut = useMutation({ mutationFn: (data) => base44.entities.MediaMarker.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['markers'] }); closeForm(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.MediaMarker.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['markers'] }); closeForm(); } });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyMarker); };
  const openEdit = (marker) => { setEditing(marker); setForm({ ...emptyMarker, ...marker }); setShowForm(true); };
  const handleSave = () => editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form);

  const mediaMap = Object.fromEntries(mediaFiles.map((media) => [media.id, media]));
  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project]));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const checkpointMap = Object.fromEntries(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
  const assetMap = Object.fromEntries(assetLocations.map((asset) => [asset.id, asset]));

  const filteredMarkers = useMemo(() => markers.filter((marker) => {
    const media = mediaMap[marker.media_file_id];
    const sessionId = media?.capture_session_id || 'unknown';
    const visibility = marker.is_client_visible ? 'client_visible' : 'internal_only';
    const searchText = `${marker.marker_label} ${media?.media_title || ''}`.toLowerCase();
    return (filters.projectId === 'all' || marker.project_id === filters.projectId)
      && (filters.sessionId === 'all' || sessionId === filters.sessionId)
      && (filters.mediaId === 'all' || marker.media_file_id === filters.mediaId)
      && (filters.confidence === 'all' || marker.confidence_level === filters.confidence)
      && (filters.visibility === 'all' || visibility === filters.visibility)
      && searchText.includes(filters.search.toLowerCase());
  }), [filters, markers, mediaMap]);

  const groupedByMedia = useMemo(() => filteredMarkers.reduce((accumulator, marker) => {
    const media = mediaMap[marker.media_file_id] || { id: 'unassigned', media_title: 'Unassigned media' };
    accumulator[media.id] ||= { media, markers: [] };
    accumulator[media.id].markers.push(marker);
    return accumulator;
  }, {}), [filteredMarkers, mediaMap]);

  const formatTimestamp = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Marker Review" description="Validate timeline markers against media, checkpoints, and asset context before project publication.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyMarker); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Marker</Button>
      </PageHeader>

      <OperatingGuide
        title="Marker Review Guide"
        description="Manual markers are placed directly by staff, estimated markers are inferred from route/session timing, and confirmed markers are review-approved references ready for broader downstream use."
        instructionCards={instructions}
        sections={[
          { heading: 'Purpose', body: 'Use this page to turn raw and estimated marker data into validated operational references tied to specific media files, checkpoints, and asset locations.' },
          { heading: 'Who Uses This', body: 'Internal reviewers, QA staff, and project administrators should use this page. It is not intended for client editing or direct public review.' },
          { heading: 'When To Use It', body: 'Review markers after media upload and after route/session information is stable. Reopen markers whenever event timing, checkpoint order, or client visibility rules change.' },
          { heading: 'How It Works', body: ['Filter the working set by project, session, media file, confidence level, or visibility so reviewers work in a controlled batch.', 'Review grouped markers media-by-media, compare timestamps against playback, and update validation status once the marker is trustworthy.', 'Use checkpoint and asset references to connect the marker back to route planning and physical site context.'] },
          { heading: 'Required Fields', body: 'Each marker should have a clear label, marker type, media file, timestamp, confidence level, and a deliberate client visibility decision. Validation status should reflect current review confidence.' },
          { heading: 'QA / Review Checklist', body: 'Reviewers should confirm timestamp accuracy, confirm that marker labels match what the media actually shows, verify linked checkpoint/asset context, and promote markers to confirmed status only after direct comparison.' },
          { heading: 'Client Visibility Rules', body: 'Internal notes can describe reviewer reasoning, timing uncertainty, or cleanup work. Client-visible notes should stay concise, objective, and free of internal shorthand.' },
          { heading: 'Related Next Steps', body: 'Once markers are confirmed, the project detail page can show stronger readiness signals and the client viewer can present only approved, client-visible marker content.' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Review Filters</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="relative xl:col-span-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search marker label or media title" className="pl-9" />
              </div>
              {[
                ['Project', 'projectId', projects.map((project) => [project.id, project.project_name])],
                ['Session', 'sessionId', sessions.map((session) => [session.id, session.session_name])],
                ['Media File', 'mediaId', mediaFiles.map((media) => [media.id, media.media_title])],
                ['Confidence', 'confidence', [['manual', 'Manual'], ['estimated', 'Estimated'], ['confirmed', 'Confirmed']]],
                ['Visibility', 'visibility', [['client_visible', 'Client Visible'], ['internal_only', 'Internal Only']]],
              ].map(([label, key, options]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Select value={filters[key]} onValueChange={(value) => setFilters((current) => ({ ...current, [key]: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : Object.keys(groupedByMedia).length === 0 ? <EmptyState icon={Bookmark} title="No markers in this review slice" description="Adjust filters or create markers to begin the review workflow." /> : (
            <div className="space-y-4">
              {Object.values(groupedByMedia).map(({ media, markers: mediaMarkers }) => (
                <Card key={media.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{media.media_title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{projectMap[media.project_id]?.project_name || 'No project'} · session {sessionMap[media.capture_session_id]?.session_name || 'unassigned'} · {mediaMarkers.length} markers</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mediaMarkers.map((marker) => {
                      const checkpoint = checkpointMap[marker.route_checkpoint_id];
                      const asset = assetMap[marker.asset_location_id];
                      return (
                        <div key={marker.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold">{marker.marker_label}</p>
                                <Badge variant="outline">{MARKER_TYPE_LABELS[marker.marker_type] || marker.marker_type}</Badge>
                                <Badge className={CONFIDENCE_COLORS[marker.confidence_level] || ''}>{marker.confidence_level === 'confirmed' ? <CheckCircle className="w-3 h-3 mr-1" /> : marker.confidence_level === 'estimated' ? <AlertCircle className="w-3 h-3 mr-1" /> : null}{marker.confidence_level}</Badge>
                                <Badge variant="secondary">{marker.validation_status || 'pending_review'}</Badge>
                                <Badge variant={marker.is_client_visible ? 'default' : 'secondary'}>{marker.is_client_visible ? 'Client visible' : 'Internal only'}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> {formatTimestamp(marker.timestamp_seconds)}</p>
                              <div className="grid gap-2 md:grid-cols-2">
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <p className="font-medium mb-1">Related checkpoint</p>
                                  <p className="text-muted-foreground">{checkpoint ? `${checkpoint.checkpoint_label} (${checkpoint.checkpoint_type})` : marker.checkpoint_reference || 'Not linked'}</p>
                                </div>
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <p className="font-medium mb-1">Asset location</p>
                                  <p className="text-muted-foreground">{asset ? asset.asset_label || asset.asset_type : marker.asset_location_reference || 'Not linked'}</p>
                                </div>
                              </div>
                              {marker.client_visible_notes && <p className="text-sm text-muted-foreground leading-6">Client note: {marker.client_visible_notes}</p>}
                              {marker.internal_notes && <p className="text-sm text-muted-foreground leading-6">Internal note: {marker.internal_notes}</p>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(marker)}><Pencil className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <WorkflowStepsPanel steps={[
            { title: 'Review the estimated set', description: 'Start with estimated markers so timing uncertainty is reduced before final validation.' },
            { title: 'Confirm against media', description: 'Use grouped media layout to compare timestamps and descriptions with what actually appears in the file.' },
            { title: 'Approve visibility', description: 'Only expose markers to clients when the label, notes, and linked context are clean and objective.' },
          ]} />
          <QAReviewChecklist items={[
            { title: 'Timestamp precision', description: 'Confirm the marker lands on the correct visual moment and not just the approximate event cluster.' },
            { title: 'Reference integrity', description: 'Link markers to the correct checkpoint and asset location whenever those records exist.' },
            { title: 'Validation status discipline', description: 'Use pending, needs_revision, or confirmed style statuses consistently so dashboards reflect true readiness.' },
          ]} />
          <VisibilityRulesPanel rules={[
            { title: 'Manual vs estimated vs confirmed', description: 'Manual = directly placed by staff, estimated = inferred from route/session timing, confirmed = verified by a reviewer against actual media.' },
            { title: 'Client note hygiene', description: 'Client-visible notes must not mention uncertainty, internal process language, or reviewer disagreements.' },
          ]} />
          <InstructionPanel instructions={instructions} />
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Marker' : 'New Marker'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Marker Label *</Label><Input value={form.marker_label} onChange={(event) => setForm((current) => ({ ...current, marker_label: event.target.value }))} /></div>
              <div><Label>Validation Status</Label><Input value={form.validation_status || ''} onChange={(event) => setForm((current) => ({ ...current, validation_status: event.target.value }))} placeholder="pending_review / confirmed" /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Type</Label><Select value={form.marker_type} onValueChange={(value) => setForm((current) => ({ ...current, marker_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MARKER_TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Confidence</Label><Select value={form.confidence_level} onValueChange={(value) => setForm((current) => ({ ...current, confidence_level: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="estimated">Estimated</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem></SelectContent></Select></div>
              <div><Label>Timestamp (seconds)</Label><Input type="number" value={form.timestamp_seconds} onChange={(event) => setForm((current) => ({ ...current, timestamp_seconds: parseFloat(event.target.value) || 0 }))} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Project</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Media File *</Label><Select value={form.media_file_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, media_file_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select media</SelectItem>{mediaFiles.map((media) => <SelectItem key={media.id} value={media.id}>{media.media_title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Checkpoint Reference</Label><Input value={form.checkpoint_reference || ''} onChange={(event) => setForm((current) => ({ ...current, checkpoint_reference: event.target.value }))} placeholder="Route checkpoint label or ID" /></div>
              <div><Label>Asset Location Reference</Label><Input value={form.asset_location_reference || ''} onChange={(event) => setForm((current) => ({ ...current, asset_location_reference: event.target.value }))} placeholder="Asset label or location ID" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2"><div><p className="text-sm font-medium">Client visible</p><p className="text-xs text-muted-foreground">Keep off until marker content is confirmed and client-safe.</p></div><Switch checked={!!form.is_client_visible} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_client_visible: checked }))} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={(event) => setForm((current) => ({ ...current, internal_notes: event.target.value }))} /></div>
            <div><Label>Client-visible Notes</Label><Textarea value={form.client_visible_notes || ''} onChange={(event) => setForm((current) => ({ ...current, client_visible_notes: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeForm}>Cancel</Button><Button onClick={handleSave} disabled={!form.marker_label || !form.media_file_id}>Save Marker</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
