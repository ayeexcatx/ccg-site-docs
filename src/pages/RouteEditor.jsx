import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OperatingGuide, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { addRouteCheckpoint, reorderRouteCheckpoints, saveDrawnRoutePath } from '@/lib/base44Workflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { CHECKPOINT_TYPE_LABELS } from '@/lib/constants';
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, MapPin, Plus, Save, Trash2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const ROUTE_TEMPLATES = {
  linear_walk: {
    name: 'Linear Walk Template',
    routePoints: [
      { lat: 34.0522, lng: -118.2437 },
      { lat: 34.053, lng: -118.2428 },
      { lat: 34.0537, lng: -118.2418 },
    ],
    checkpoints: [
      { checkpoint_type: 'start', checkpoint_label: 'Start of segment', is_client_visible: true },
      { checkpoint_type: 'intersection', checkpoint_label: 'Primary intersection', is_client_visible: true },
      { checkpoint_type: 'end', checkpoint_label: 'End of segment', is_client_visible: true },
    ],
  },
  curb_ramp_pass: {
    name: 'Curb Ramp Sweep Template',
    routePoints: [
      { lat: 34.0514, lng: -118.2444 },
      { lat: 34.0519, lng: -118.2437 },
      { lat: 34.0525, lng: -118.2429 },
      { lat: 34.053, lng: -118.2422 },
    ],
    checkpoints: [
      { checkpoint_type: 'start', checkpoint_label: 'Approach start', is_client_visible: false },
      { checkpoint_type: 'curb_ramp', checkpoint_label: 'Curb ramp focus point', is_client_visible: true },
      { checkpoint_type: 'end', checkpoint_label: 'Departure point', is_client_visible: true },
    ],
  },
};

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (event) => onMapClick(event.latlng) });
  return null;
}

export default function RouteEditor() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [routeName, setRouteName] = useState('');
  const [routePoints, setRoutePoints] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);
  const [newCheckpoint, setNewCheckpoint] = useState({ checkpoint_type: 'intersection', checkpoint_label: '', is_client_visible: true });
  const [isDrawing, setIsDrawing] = useState(false);
  const [routeWarning, setRouteWarning] = useState('');
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('route_editor');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: routes = [] } = useQuery({ queryKey: ['routes', selectedSessionId], queryFn: () => base44.entities.RoutePath.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const { data: existingCheckpoints = [] } = useQuery({ queryKey: ['route-checkpoints', selectedSessionId], queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });

  const projectSegments = useMemo(() => segments.filter((segment) => !selectedProjectId || segment.project_id === selectedProjectId), [segments, selectedProjectId]);
  const segmentSessions = useMemo(() => sessions.filter((session) => (!selectedProjectId || session.project_id === selectedProjectId) && (!selectedSegmentId || session.street_segment_id === selectedSegmentId)), [sessions, selectedProjectId, selectedSegmentId]);
  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [sessions, selectedSessionId]);

  useEffect(() => {
    if (selectedSession?.project_id) setSelectedProjectId(selectedSession.project_id);
    if (selectedSession?.street_segment_id) setSelectedSegmentId(selectedSession.street_segment_id);
  }, [selectedSession]);

  useEffect(() => {
    const route = routes[0];
    if (route) {
      setRouteName(route.route_name || '');
      try { setRoutePoints(JSON.parse(route.polyline_json || '[]')); } catch { setRoutePoints([]); }
    } else {
      setRouteName('');
      setRoutePoints([]);
    }
    setCheckpoints(existingCheckpoints.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)));
  }, [routes, existingCheckpoints]);

  const checkpointMut = useMutation({
    mutationFn: ({ checkpoint, sequenceOrder }) => addRouteCheckpoint({ session: selectedSession, routePathId: routes[0]?.id, checkpoint, sequenceOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-checkpoints', selectedSessionId] }),
  });

  const saveRouteMut = useMutation({
    mutationFn: async () => {
      const startCount = checkpoints.filter((checkpoint) => checkpoint.checkpoint_type === 'start').length;
      const endCount = checkpoints.filter((checkpoint) => checkpoint.checkpoint_type === 'end').length;
      if (routePoints.length < 2) throw new Error('Routes require at least two points.');
      if (startCount === 0 || endCount === 0) throw new Error('Routes require both a start and end checkpoint before saving.');
      return saveDrawnRoutePath({ existingRouteId: routes[0]?.id, session: selectedSession, routeName, routePoints, checkpoints, templateName: ROUTE_TEMPLATES[selectedTemplate]?.name });
    },
    onSuccess: () => {
      setRouteWarning('');
      queryClient.invalidateQueries({ queryKey: ['routes', selectedSessionId] });
    },
    onError: (error) => setRouteWarning(error.message || 'Unable to save route.'),
  });

  const deleteCheckpointMut = useMutation({
    mutationFn: (checkpointId) => base44.entities.RouteCheckpoint.delete(checkpointId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-checkpoints', selectedSessionId] }),
  });

  const updateCheckpointMut = useMutation({
    mutationFn: ({ checkpointId, data }) => base44.entities.RouteCheckpoint.update(checkpointId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-checkpoints', selectedSessionId] }),
  });

  const handleMapClick = (latlng) => {
    if (isDrawing) {
      setRoutePoints((current) => [...current, { lat: latlng.lat, lng: latlng.lng }]);
    }
    if (addingCheckpoint && newCheckpoint.checkpoint_label && selectedSession) {
      checkpointMut.mutate({
        checkpoint: {
          ...newCheckpoint,
          map_latitude: latlng.lat,
          map_longitude: latlng.lng,
        },
        sequenceOrder: checkpoints.length,
      });
      setAddingCheckpoint(false);
      setNewCheckpoint({ checkpoint_type: 'intersection', checkpoint_label: '', is_client_visible: true });
    }
  };

  const applyTemplate = () => {
    const template = ROUTE_TEMPLATES[selectedTemplate];
    if (!template) return;
    setRouteName(template.name);
    setRoutePoints(template.routePoints);
    setCheckpoints(
      template.checkpoints.map((checkpoint, index) => ({
        ...checkpoint,
        id: `template-${index}`,
        sequence_order: index,
        map_latitude: template.routePoints[index]?.lat,
        map_longitude: template.routePoints[index]?.lng,
      }))
    );
    setRouteWarning('Template loaded locally. Save the route to persist the path, then re-add template checkpoints onto the map if needed.');
  };

  const moveCheckpoint = async (index, direction) => {
    const next = [...checkpoints];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setCheckpoints(next.map((checkpoint, sequence_order) => ({ ...checkpoint, sequence_order })));
    const persisted = next.filter((checkpoint) => checkpoint.id && !String(checkpoint.id).startsWith('template-'));
    if (persisted.length) await reorderRouteCheckpoints(next.filter((checkpoint) => checkpoint.id && !String(checkpoint.id).startsWith('template-')));
    queryClient.invalidateQueries({ queryKey: ['route-checkpoints', selectedSessionId] });
  };

  const onDragEnd = async ({ source, destination }) => {
    if (!destination || source.index === destination.index) return;
    const next = [...checkpoints];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    const resequenced = next.map((checkpoint, sequence_order) => ({ ...checkpoint, sequence_order }));
    setCheckpoints(resequenced);
    const persisted = resequenced.filter((checkpoint) => checkpoint.id && !String(checkpoint.id).startsWith('template-'));
    if (persisted.length) await reorderRouteCheckpoints(persisted);
    queryClient.invalidateQueries({ queryKey: ['route-checkpoints', selectedSessionId] });
  };

  const routeSummary = {
    pointCount: routePoints.length,
    checkpointCount: checkpoints.length,
    start: checkpoints.find((checkpoint) => checkpoint.checkpoint_type === 'start')?.checkpoint_label || 'Missing start',
    end: checkpoints.find((checkpoint) => checkpoint.checkpoint_type === 'end')?.checkpoint_label || 'Missing end',
    completeness: routePoints.length >= 2 && checkpoints.some((checkpoint) => checkpoint.checkpoint_type === 'start') && checkpoints.some((checkpoint) => checkpoint.checkpoint_type === 'end') ? 'Operationally complete' : 'Needs review',
  };

  return (
    <div>
      <PageHeader title="Route Editor" description="Build, validate, and maintain route paths that link segment geography, capture sessions, and downstream marker workflows." />

      <OperatingGuide
        title="Route Editor Operating Guide"
        description="Use this page to define the physical travel path for a segment-specific capture session, place checkpoints, and preserve the internal/client visibility split before marker generation begins."
        instructionCards={instructions}
        sections={[
          { heading: 'Purpose', body: 'The Route Editor converts field capture intent into an operational route record. It is the control point for segment-to-session alignment, route completeness, and checkpoint visibility decisions that later drive marker creation and client deliverables.' },
          { heading: 'Who Uses This', body: 'Project administrators, route planners, and QA reviewers should use this page. Documenters may reference it in the field, but edits should be controlled by internal staff so checkpoint sequencing and client visibility remain consistent.' },
          { heading: 'When To Use It', body: 'Use this page after a project segment exists and before or during capture-session preparation. Revisit it whenever the walking/driving order changes, when a session is split into multiple passes, or when checkpoints need stronger client/internal separation.' },
          { heading: 'How It Works', body: ['First select the project, then narrow to a segment, then choose the capture session. Existing route paths and checkpoints load automatically for that session.', 'Use Draw Route to keep the click-to-draw map workflow. Optional templates can seed a route structure for common passes, but staff should still verify every point and checkpoint against the real field plan.', 'Add checkpoints by preparing a label and type, then clicking the map. Reorder checkpoints to match the field traversal order before saving and QA handoff.'] },
          { heading: 'Required Fields', body: 'A valid route should include a session selection, at least two map points, a route name or template context, and both a start and end checkpoint. Checkpoint labels should clearly describe what the field team will recognize on-site.' },
          { heading: 'QA / Review Checklist', body: 'Confirm that the route begins and ends where the session team expects, checkpoint order matches travel order, internal-only notes are not exposed to clients, and the summary indicates an operationally complete route before saving.' },
          { heading: 'Client Visibility Rules', body: 'Only checkpoints that support client interpretation should be marked client-visible. Internal-only checkpoints may reference staging notes, retake cues, or QA anchors that must never appear in the client portal.' },
          { heading: 'Related Next Steps', body: 'After the route is saved, documenters can run the field session, reviewers can estimate markers from events, and project managers can confirm readiness on the project detail page.' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3"><CardTitle className="text-base">Interactive Route Map</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="h-[560px]">
                <MapContainer center={[34.0522, -118.2437]} zoom={14} className="h-full w-full" scrollWheelZoom>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {routePoints.length > 1 && <Polyline positions={routePoints} color="#2563eb" weight={4} />}
                  {routePoints.map((point, index) => (
                    <Marker key={`route-point-${index}`} position={[point.lat, point.lng]}>
                      <Popup>Route point {index + 1}</Popup>
                    </Marker>
                  ))}
                  {checkpoints.filter((checkpoint) => checkpoint.map_latitude && checkpoint.map_longitude).map((checkpoint, index) => (
                    <Marker key={checkpoint.id || `checkpoint-${index}`} position={[checkpoint.map_latitude, checkpoint.map_longitude]}>
                      <Popup>{checkpoint.checkpoint_label}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <QAReviewChecklist items={[
              { title: 'Segment/session alignment', description: 'Verify that the loaded route belongs to the intended project, segment, and capture session combination before editing the map.' },
              { title: 'Start/end integrity', description: 'Ensure the first checkpoint communicates where the session begins and the last checkpoint communicates where the session closes.' },
              { title: 'Checkpoint visibility', description: 'Review each checkpoint visibility toggle so client-facing references exclude internal guidance, QC notes, and reviewer shorthand.' },
            ]} />
            <VisibilityRulesPanel rules={[
              { title: 'Client-visible checkpoints', description: 'Use for intersections, curb ramps, landmarks, and route anchors that help client reviewers navigate media or understand location context.' },
              { title: 'Internal-only checkpoints', description: 'Use for staging positions, retake reminders, quality concerns, or reviewer notes that should stay in-house.' },
            ]} />
            <WorkflowStepsPanel steps={[
              { title: 'Select context', description: 'Pick project, segment, and session in sequence so edits stay attached to the correct operational record.' },
              { title: 'Draw or load route', description: 'Load any saved route for the session, or draw a new path or template-assisted baseline.' },
              { title: 'Place and review checkpoints', description: 'Create checkpoints, reorder them, and confirm route completeness before saving and handing off to the field/review team.' },
            ]} />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Guided Route Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>1. Project</Label>
                <Select value={selectedProjectId || 'none'} onValueChange={(value) => { const next = value === 'none' ? '' : value; setSelectedProjectId(next); setSelectedSegmentId(''); setSelectedSessionId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>2. Segment</Label>
                <Select value={selectedSegmentId || 'none'} onValueChange={(value) => { setSelectedSegmentId(value === 'none' ? '' : value); setSelectedSessionId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select segment</SelectItem>{projectSegments.map((segment) => <SelectItem key={segment.id} value={segment.id}>{segment.segment_code || segment.street_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>3. Capture Session</Label>
                <Select value={selectedSessionId || 'none'} onValueChange={(value) => setSelectedSessionId(value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select session</SelectItem>{segmentSessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Route Name</Label>
                <Input value={routeName} onChange={(event) => setRouteName(event.target.value)} placeholder="Segment primary walking route" />
              </div>
              <div>
                <Label>Route Template</Label>
                <div className="flex gap-2">
                  <Select value={selectedTemplate || 'none'} onValueChange={(value) => setSelectedTemplate(value === 'none' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Optional template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {Object.entries(ROUTE_TEMPLATES).map(([key, template]) => <SelectItem key={key} value={key}>{template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={applyTemplate} disabled={!selectedTemplate}>Create from template</Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant={isDrawing ? 'destructive' : 'default'} onClick={() => setIsDrawing((value) => !value)} disabled={!selectedSessionId}>{isDrawing ? 'Stop Drawing' : 'Draw Route'}</Button>
                <Button variant="outline" onClick={() => setRoutePoints([])} disabled={!routePoints.length}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <Button className="w-full gap-2" onClick={() => saveRouteMut.mutate()} disabled={!selectedSessionId}><Save className="w-4 h-4" /> Save Route</Button>
              {routeWarning && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>{routeWarning}</AlertDescription></Alert>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Route Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Point count</span><span className="font-medium text-foreground">{routeSummary.pointCount}</span></div>
              <div className="flex justify-between"><span>Checkpoint count</span><span className="font-medium text-foreground">{routeSummary.checkpointCount}</span></div>
              <div className="flex justify-between gap-4"><span>Start</span><span className="font-medium text-right text-foreground">{routeSummary.start}</span></div>
              <div className="flex justify-between gap-4"><span>End</span><span className="font-medium text-right text-foreground">{routeSummary.end}</span></div>
              <div className="flex justify-between"><span>Completeness</span><Badge variant={routeSummary.completeness === 'Operationally complete' ? 'default' : 'secondary'}>{routeSummary.completeness}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Checkpoint Builder</CardTitle><Button size="sm" variant="outline" onClick={() => setAddingCheckpoint((value) => !value)} disabled={!selectedSessionId}><Plus className="w-4 h-4 mr-1" /> Add</Button></CardHeader>
            <CardContent className="space-y-4">
              {addingCheckpoint && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div>
                    <Label>Checkpoint Type</Label>
                    <Select value={newCheckpoint.checkpoint_type} onValueChange={(value) => setNewCheckpoint((current) => ({ ...current, checkpoint_type: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CHECKPOINT_TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Checkpoint Label</Label>
                    <Input value={newCheckpoint.checkpoint_label} onChange={(event) => setNewCheckpoint((current) => ({ ...current, checkpoint_label: event.target.value }))} placeholder="Northwest corner curb ramp" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Client visible</p>
                      <p className="text-xs text-muted-foreground">Turn off for internal guidance only.</p>
                    </div>
                    <Switch checked={newCheckpoint.is_client_visible} onCheckedChange={(checked) => setNewCheckpoint((current) => ({ ...current, is_client_visible: checked }))} />
                  </div>
                  <p className="text-xs text-muted-foreground">After completing this form, click the map at the checkpoint location to place it.</p>
                </div>
              )}

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="checkpoints">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-[420px] overflow-y-auto">
                      {checkpoints.map((checkpoint, index) => (
                        <Draggable key={checkpoint.id || `checkpoint-${index}`} draggableId={String(checkpoint.id || `checkpoint-${index}`)} index={index}>
                          {(dragProvided) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="rounded-lg border p-3 bg-background">
                              <div className="flex items-start gap-3">
                                <div {...dragProvided.dragHandleProps} className="pt-2 text-muted-foreground"><GripVertical className="w-4 h-4" /></div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input value={checkpoint.checkpoint_label || ''} onChange={(event) => setCheckpoints((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, checkpoint_label: event.target.value } : item))} onBlur={() => checkpoint.id && !String(checkpoint.id).startsWith('template-') && updateCheckpointMut.mutate({ checkpointId: checkpoint.id, data: { checkpoint_label: checkpoint.checkpoint_label } })} />
                                    <Badge variant="outline">#{index + 1}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <Badge>{CHECKPOINT_TYPE_LABELS[checkpoint.checkpoint_type] || checkpoint.checkpoint_type}</Badge>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs">Client visible</Label>
                                      <Switch checked={!!checkpoint.is_client_visible} onCheckedChange={(checked) => { setCheckpoints((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, is_client_visible: checked } : item)); if (checkpoint.id && !String(checkpoint.id).startsWith('template-')) updateCheckpointMut.mutate({ checkpointId: checkpoint.id, data: { is_client_visible: checked } }); }} />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" /> {checkpoint.map_latitude?.toFixed?.(5) || '—'}, {checkpoint.map_longitude?.toFixed?.(5) || '—'}</div>
                                    <div className="flex gap-1">
                                      <Button size="icon" variant="ghost" onClick={() => moveCheckpoint(index, -1)}><ArrowUp className="w-4 h-4" /></Button>
                                      <Button size="icon" variant="ghost" onClick={() => moveCheckpoint(index, 1)}><ArrowDown className="w-4 h-4" /></Button>
                                      <Button size="icon" variant="ghost" onClick={() => checkpoint.id && !String(checkpoint.id).startsWith('template-') ? deleteCheckpointMut.mutate(checkpoint.id) : setCheckpoints((current) => current.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {checkpoints.length === 0 && <p className="text-sm text-center text-muted-foreground py-6">No checkpoints added yet. Add operational checkpoints for start/end and field reference locations.</p>}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>

          <InstructionPanel instructions={instructions.filter((instruction) => instruction.instruction_category === 'qa' || instruction.instruction_category === 'mapping')} />
        </div>
      </div>
    </div>
  );
}
