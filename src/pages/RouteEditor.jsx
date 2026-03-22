import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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
import { DocumentationPageIntro, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel, NextStepPanel } from '@/components/ui/OperatingGuidance';
import FutureReadyPanel from '@/components/ui/FutureReadyPanel';
import { reorderRouteCheckpoints, saveDrawnRoutePath, syncRouteCheckpoints } from '@/lib/base44Workflows';
import { ensureRouteCheckpointDefaults, getRoutePathSummary, getRouteValidationWarnings, orderCheckpoints } from '@/lib/domainWorkflows';
import { buildRouteMediaSyncEnvelope } from '@/lib/futureArchitecture';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { CHECKPOINT_TYPE_LABELS } from '@/lib/constants';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, GripVertical, ListChecks, MapPin, Plus, Save, Search, Trash2, Undo2, WandSparkles } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CHECKPOINT = { checkpoint_type: 'intersection', checkpoint_label: '', is_client_visible: true };
const EMPTY_ROUTE_STATE = { projectId: '', segmentId: '', sessionId: '', template: '', routeName: '', routePoints: [], checkpoints: [], warning: '', success: '', isDrawing: false, searchQuery: '', searchResults: [] };

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


function MapViewportController({ focusPoint }) {
  const map = useMap();
  useEffect(() => {
    if (focusPoint) map.setView([focusPoint.lat, focusPoint.lng], 18);
  }, [focusPoint, map]);
  return null;
}

function buildTemplateCheckpoints(template) {
  return template.checkpoints.map((checkpoint, index) => ({
    ...checkpoint,
    id: `template-${index}`,
    sequence_order: index,
    map_latitude: template.routePoints[index]?.lat,
    map_longitude: template.routePoints[index]?.lng,
  }));
}

function StepHint({ step, title, description, active, complete, disabled }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? 'border-primary bg-primary/5' : 'bg-background'} ${disabled ? 'opacity-60' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${complete ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{step}</div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function RouteSetupPanel({ projects, projectSegments, segmentSessions, state, setState, selectedProject, selectedSegment, selectedSession, onApplyTemplate, onToggleDrawing, onSave, onSearchLocation, onUndoLastPoint, validationWarnings, routeSuggestion }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Guided Route Setup</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <StepHint step="1" title="Choose project" description="Start with the client project so the route cannot drift into the wrong operational scope." active={!state.projectId} complete={!!state.projectId} />
          <div>
            <Label>Project</Label>
            <Select value={state.projectId || 'none'} onValueChange={(value) => setState((current) => ({ ...current, projectId: value === 'none' ? '' : value, segmentId: '', sessionId: '', routeName: '', routePoints: [], checkpoints: [], warning: '', success: '', isDrawing: false }))}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedProject && <p className="mt-2 text-xs text-muted-foreground">Selected project: {selectedProject.project_code || selectedProject.project_name}.</p>}
          </div>
        </div>

        <div className="grid gap-3">
          <StepHint step="2" title="Choose segment" description="Select the exact street segment that the route should cover. This keeps checkpoints and downstream media aligned." active={!!state.projectId && !state.segmentId} complete={!!state.segmentId} disabled={!state.projectId} />
          <div>
            <Label>Segment</Label>
            <Select value={state.segmentId || 'none'} onValueChange={(value) => setState((current) => ({ ...current, segmentId: value === 'none' ? '' : value, sessionId: '', routeName: '', routePoints: [], checkpoints: [], warning: '', success: '', isDrawing: false }))}>
              <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Select segment</SelectItem>{projectSegments.map((segment) => <SelectItem key={segment.id} value={segment.id}>{segment.segment_code || segment.street_name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSegment && <p className="mt-2 text-xs text-muted-foreground">Coverage target: {selectedSegment.street_name || 'Unnamed segment'} {selectedSegment.from_intersection ? `from ${selectedSegment.from_intersection}` : ''} {selectedSegment.to_intersection ? `to ${selectedSegment.to_intersection}` : ''}.</p>}
          </div>
        </div>

        <div className="grid gap-3">
          <StepHint step="3" title="Choose session" description="Attach the route to the actual field session that will use it so timer events and markers can reuse this route spine." active={!!state.segmentId && !state.sessionId} complete={!!state.sessionId} disabled={!state.segmentId} />
          <div>
            <Label>Capture Session</Label>
            <Select value={state.sessionId || 'none'} onValueChange={(value) => setState((current) => ({ ...current, sessionId: value === 'none' ? '' : value, warning: '', success: '' }))}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Select session</SelectItem>{segmentSessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSession && <p className="mt-2 text-xs text-muted-foreground">Session ready: {selectedSession.session_name}.</p>}
          </div>
        </div>

        <div>
          <Label>Route Name</Label>
          <Input value={state.routeName} onChange={(event) => setState((current) => ({ ...current, routeName: event.target.value }))} placeholder="Segment primary walking route" />
        </div>

        <div>
          <Label>Location Search</Label>
          <div className="flex gap-2">
            <Input value={state.searchQuery || ''} onChange={(event) => setState((current) => ({ ...current, searchQuery: event.target.value }))} placeholder="Search address, city, or place" />
            <Button variant="outline" onClick={onSearchLocation} disabled={!state.searchQuery}><Search className="mr-2 h-4 w-4" /> Find</Button>
          </div>
          {!!state.searchResults?.length && <div className="mt-2 rounded-lg border bg-muted/20 p-2 text-xs text-muted-foreground">Top result ready. The map will zoom to the first matching location.</div>}
        </div>

        <div>
          <Label>Route Template</Label>
          <div className="flex gap-2">
            <Select value={state.template || 'none'} onValueChange={(value) => setState((current) => ({ ...current, template: value === 'none' ? '' : value }))}>
              <SelectTrigger><SelectValue placeholder="Optional template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {Object.entries(ROUTE_TEMPLATES).map(([key, template]) => <SelectItem key={key} value={key}>{template.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onApplyTemplate} disabled={!state.template}><WandSparkles className="mr-2 h-4 w-4" /> Apply</Button>
          </div>
        </div>

        {routeSuggestion && <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Suggested route pattern:</span> {routeSuggestion}</p>}

        <div className="flex gap-2">
          <Button className="flex-1" variant={state.isDrawing ? 'destructive' : 'default'} onClick={onToggleDrawing} disabled={!state.sessionId}>{state.isDrawing ? 'Stop Drawing' : 'Draw Route'}</Button>
          <Button variant="outline" onClick={onUndoLastPoint} disabled={!state.routePoints.length}><Undo2 className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={() => setState((current) => ({ ...current, routePoints: [], warning: '', success: '' }))} disabled={!state.routePoints.length}><Trash2 className="w-4 h-4" /></Button>
        </div>
        <Button className="w-full gap-2" onClick={onSave} disabled={!state.sessionId || validationWarnings.length > 0}><Save className="w-4 h-4" /> Save Route</Button>
        {validationWarnings.length > 0 && <p className="text-xs text-muted-foreground">Saving stays disabled until the route has a project, segment, session, name, usable geometry, and labeled checkpoints. Start and End are auto-derived from the first and last route points.</p>}

        {!!validationWarnings.length && (
          <div className="space-y-2">
            {validationWarnings.map((warning) => (
              <Alert key={warning}><AlertTriangle className="h-4 w-4" /><AlertDescription>{warning}</AlertDescription></Alert>
            ))}
          </div>
        )}
        {state.success && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{state.success}</AlertDescription></Alert>}
        {state.warning && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>{state.warning}</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
}

function RouteSummaryCards({ routeSummary, validationWarnings, selectedProject, selectedSegment, selectedSession }) {
  const cards = [
    { label: 'Route points', value: routeSummary.pointCount, tone: 'default', detail: 'Map vertices captured in the active route geometry.' },
    { label: 'Checkpoints', value: routeSummary.checkpointCount, tone: 'default', detail: 'Ordered operational checkpoints available to field and review workflows.' },
    { label: 'Client-visible', value: routeSummary.orderedCheckpoints.filter((checkpoint) => checkpoint.is_client_visible).length, tone: 'default', detail: 'Checkpoints eligible to support client-facing interpretation.' },
    { label: 'Validation', value: validationWarnings.length === 0 ? 'Ready' : `${validationWarnings.length} warning${validationWarnings.length === 1 ? '' : 's'}`, tone: validationWarnings.length === 0 ? 'success' : 'warning', detail: validationWarnings.length === 0 ? 'No active warnings detected.' : 'Review the warning list before saving.' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.tone === 'warning' ? 'border-amber-200 bg-amber-50' : card.tone === 'success' ? 'border-emerald-200 bg-emerald-50' : 'bg-background'}`}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Operational Route Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex justify-between gap-4"><span>Project</span><span className="text-right font-medium text-foreground">{selectedProject?.project_name || 'Not selected'}</span></div>
          <div className="flex justify-between gap-4"><span>Segment</span><span className="text-right font-medium text-foreground">{selectedSegment?.segment_code || selectedSegment?.street_name || 'Not selected'}</span></div>
          <div className="flex justify-between gap-4"><span>Session</span><span className="text-right font-medium text-foreground">{selectedSession?.session_name || 'Not selected'}</span></div>
          <div className="flex justify-between gap-4"><span>Start checkpoint</span><span className="text-right font-medium text-foreground">{routeSummary.startLabel}</span></div>
          <div className="flex justify-between gap-4"><span>End checkpoint</span><span className="text-right font-medium text-foreground">{routeSummary.endLabel}</span></div>
          <div className="flex justify-between gap-4"><span>Route state</span><Badge variant={validationWarnings.length === 0 ? 'default' : 'secondary'}>{routeSummary.completenessLabel}</Badge></div>
        </CardContent>
      </Card>
    </div>
  );
}
function CheckpointBuilder({ checkpoints, setCheckpoints, addingCheckpoint, setAddingCheckpoint, newCheckpoint, setNewCheckpoint, selectedSessionId, updateCheckpointMut, deleteCheckpointMut, moveCheckpoint, onDragEnd, routeSuggestion }) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Checkpoint Operations</CardTitle><Button size="sm" variant="outline" onClick={() => setAddingCheckpoint((value) => !value)} disabled={!selectedSessionId}><Plus className="w-4 h-4 mr-1" /> Add checkpoint</Button></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          {routeSuggestion && <p className="mb-2 text-sm text-foreground"><span className="font-semibold">Suggested route pattern:</span> {routeSuggestion}</p>}
          <p className="mb-2 text-sm font-semibold">Checkpoint operator guidance</p>
          <p className="text-sm leading-6 text-muted-foreground">Start and End stay synced to the first and last route points automatically. Add or edit only the intermediate checkpoints that help field staff, uploads, and review workflows.</p>
        </div>

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
            <p className="text-xs text-muted-foreground">After completing this form, click the map where the intermediate checkpoint belongs. It will be inserted between the automatic Start and End anchors.</p>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="checkpoints">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-[480px] overflow-y-auto">
                {checkpoints.map((checkpoint, index) => (
                  <Draggable key={checkpoint.id || `checkpoint-${index}`} draggableId={String(checkpoint.id || `checkpoint-${index}`)} index={index}>
                    {(dragProvided) => (
                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="rounded-lg border bg-background p-3">
                        <div className="flex items-start gap-3">
                          <div {...dragProvided.dragHandleProps} className="pt-2 text-muted-foreground"><GripVertical className="w-4 h-4" /></div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Input value={checkpoint.checkpoint_label || ''} onChange={(event) => setCheckpoints((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, checkpoint_label: event.target.value } : item))} onBlur={() => checkpoint.id && !String(checkpoint.id).startsWith('template-') && updateCheckpointMut.mutate({ checkpointId: checkpoint.id, data: { checkpoint_label: checkpoint.checkpoint_label } })} />
                              <Badge variant="outline">#{index + 1}</Badge>
                              <Badge>{CHECKPOINT_TYPE_LABELS[checkpoint.checkpoint_type] || checkpoint.checkpoint_type}</Badge>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" /> {checkpoint.map_latitude?.toFixed?.(5) || '—'}, {checkpoint.map_longitude?.toFixed?.(5) || '—'}</div>
                              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                                {checkpoint.is_client_visible ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                                <Label className="text-xs">Client visible</Label>
                                <Switch checked={!!checkpoint.is_client_visible} onCheckedChange={(checked) => {
                                  setCheckpoints((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, is_client_visible: checked } : item));
                                  if (checkpoint.id && !String(checkpoint.id).startsWith('template-')) updateCheckpointMut.mutate({ checkpointId: checkpoint.id, data: { is_client_visible: checked } });
                                }} />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-muted-foreground">{checkpoint.is_client_visible ? 'Visible to downstream client-safe interpretation when published.' : 'Internal-only operational reference.'}</p>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" disabled={checkpoint.checkpoint_type === 'start'} onClick={() => moveCheckpoint(index, -1)}><ArrowUp className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" disabled={checkpoint.checkpoint_type === 'end'} onClick={() => moveCheckpoint(index, 1)}><ArrowDown className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" disabled={checkpoint.is_route_endpoint_default} onClick={() => checkpoint.id && !String(checkpoint.id).startsWith('template-') ? deleteCheckpointMut.mutate(checkpoint.id) : setCheckpoints((current) => current.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {checkpoints.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Draw the route first. Start and End will appear automatically, then add any intermediate checkpoints you need.</p>}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}

export default function RouteEditor() {
  const [routeState, setRouteState] = useState(EMPTY_ROUTE_STATE);
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);
  const [newCheckpoint, setNewCheckpoint] = useState(DEFAULT_CHECKPOINT);
  const [focusedSearchPoint, setFocusedSearchPoint] = useState(null);
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('route_editor');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: routes = [] } = useQuery({ queryKey: ['routes', routeState.sessionId], queryFn: () => base44.entities.RoutePath.filter({ capture_session_id: routeState.sessionId }), enabled: !!routeState.sessionId });
  const { data: existingCheckpoints = [] } = useQuery({ queryKey: ['route-checkpoints', routeState.sessionId], queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: routeState.sessionId }), enabled: !!routeState.sessionId });

  const projectSegments = useMemo(() => segments.filter((segment) => !routeState.projectId || segment.project_id === routeState.projectId), [segments, routeState.projectId]);
  const segmentSessions = useMemo(() => sessions.filter((session) => (!routeState.projectId || session.project_id === routeState.projectId) && (!routeState.segmentId || session.street_segment_id === routeState.segmentId)), [sessions, routeState.projectId, routeState.segmentId]);
  const selectedProject = useMemo(() => projects.find((project) => project.id === routeState.projectId), [projects, routeState.projectId]);
  const selectedSegment = useMemo(() => segments.find((segment) => segment.id === routeState.segmentId), [segments, routeState.segmentId]);
  const selectedSession = useMemo(() => sessions.find((session) => session.id === routeState.sessionId), [sessions, routeState.sessionId]);
  const normalizedCheckpoints = useMemo(() => ensureRouteCheckpointDefaults(routeState.routePoints, routeState.checkpoints), [routeState.routePoints, routeState.checkpoints]);
  const routeSummary = useMemo(() => getRoutePathSummary(routeState.routePoints, normalizedCheckpoints), [routeState.routePoints, normalizedCheckpoints]);
  const syncEnvelope = useMemo(() => buildRouteMediaSyncEnvelope({ route: routes[0], checkpoints: routeState.checkpoints, session: selectedSession }), [routes, routeState.checkpoints, selectedSession]);
  const routeSuggestion = useMemo(() => {
    const viewType = selectedSession?.view_type;
    if (viewType === 'cross_section') return 'Use the center line or center crossing path for this route.';
    if (selectedSession?.session_name?.toLowerCase().includes('right')) return 'Bias the route to the right side of travel so the right profile stays consistent.';
    if (selectedSession?.session_name?.toLowerCase().includes('left')) return 'Bias the route to the left side of travel so the left profile stays consistent.';
    if (viewType === 'curb_line_edge_of_pavement') return 'Follow the curb line or pavement edge instead of the lane center.';
    return 'Build the route in the same order the field crew should physically travel it.';
  }, [selectedSession]);

  const validationWarnings = useMemo(() => getRouteValidationWarnings({
    projectId: routeState.projectId,
    segmentId: routeState.segmentId,
    sessionId: routeState.sessionId,
    routeName: routeState.routeName,
    routePoints: routeState.routePoints,
    checkpoints: normalizedCheckpoints,
  }), [routeState.projectId, routeState.segmentId, routeState.sessionId, routeState.routeName, routeState.routePoints, normalizedCheckpoints]);

  useEffect(() => {
    if (!selectedSession) return;
    setRouteState((current) => ({
      ...current,
      projectId: selectedSession.project_id || current.projectId,
      segmentId: selectedSession.street_segment_id || current.segmentId,
    }));
  }, [selectedSession]);

  useEffect(() => {
    setRouteState((current) => {
      const nextCheckpoints = ensureRouteCheckpointDefaults(current.routePoints, current.checkpoints);
      const unchanged = JSON.stringify(nextCheckpoints) === JSON.stringify(current.checkpoints);
      return unchanged ? current : { ...current, checkpoints: nextCheckpoints };
    });
  }, [routeState.routePoints]);

  useEffect(() => {
    const route = routes[0];
    setRouteState((current) => {
      const sortedCheckpoints = orderCheckpoints(existingCheckpoints);
      if (!route) {
        return { ...current, routeName: current.sessionId ? current.routeName : '', routePoints: current.sessionId ? current.routePoints : [], checkpoints: sortedCheckpoints, success: '', warning: '' };
      }

      try {
        return {
          ...current,
          routeName: route.route_name || '',
          routePoints: JSON.parse(route.polyline_json || '[]'),
          checkpoints: sortedCheckpoints,
          success: '',
          warning: '',
        };
      } catch {
        return { ...current, routeName: route.route_name || '', routePoints: [], checkpoints: sortedCheckpoints, success: '', warning: 'Saved route geometry could not be parsed. Redraw and save again.' };
      }
    });
  }, [routes, existingCheckpoints]);

  const saveRouteMut = useMutation({
    mutationFn: async () => {
      const checkpointsToSave = ensureRouteCheckpointDefaults(routeState.routePoints, routeState.checkpoints);
      if (routeState.routePoints.length < 2) throw new Error('Routes require at least two points.');
      if (checkpointsToSave.some((checkpoint) => !checkpoint.checkpoint_label?.trim())) throw new Error('Rename every checkpoint before saving so field staff can trust the route order.');
      const savedRoute = await saveDrawnRoutePath({
        existingRouteId: routes[0]?.id,
        session: selectedSession,
        routeName: routeState.routeName,
        routePoints: routeState.routePoints,
        checkpoints: checkpointsToSave,
        templateName: ROUTE_TEMPLATES[routeState.template]?.name,
      });
      await syncRouteCheckpoints({
        session: selectedSession,
        routePathId: savedRoute.id,
        routePoints: routeState.routePoints,
        checkpoints: checkpointsToSave,
        existingCheckpoints,
      });
      return savedRoute;
    },
    onSuccess: () => {
      setRouteState((current) => ({ ...current, warning: '', success: 'Route, session link, and checkpoint data saved successfully.' }));
      queryClient.invalidateQueries({ queryKey: ['routes', routeState.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['route-checkpoints', routeState.sessionId] });
    },
    onError: (error) => setRouteState((current) => ({ ...current, success: '', warning: error.message || 'Unable to save route.' })),
  });

  const deleteCheckpointMut = useMutation({
    mutationFn: (checkpointId) => base44.entities.RouteCheckpoint.delete(checkpointId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-checkpoints', routeState.sessionId] }),
  });

  const updateCheckpointMut = useMutation({
    mutationFn: ({ checkpointId, data }) => base44.entities.RouteCheckpoint.update(checkpointId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-checkpoints', routeState.sessionId] }),
  });

  const resequencePersistedCheckpoints = useCallback(async (nextCheckpoints) => {
    const persisted = nextCheckpoints.filter((checkpoint) => checkpoint.id && !String(checkpoint.id).startsWith('template-'));
    if (persisted.length) {
      await reorderRouteCheckpoints(persisted);
      queryClient.invalidateQueries({ queryKey: ['route-checkpoints', routeState.sessionId] });
    }
  }, [queryClient, routeState.sessionId]);

  const handleMapClick = useCallback((latlng) => {
    if (routeState.isDrawing) {
      setRouteState((current) => ({ ...current, success: '', warning: '', routePoints: [...current.routePoints, { lat: latlng.lat, lng: latlng.lng }] }));
    }

    if (addingCheckpoint && newCheckpoint.checkpoint_label && selectedSession) {
      setRouteState((current) => ({
        ...current,
        success: '',
        warning: '',
        checkpoints: orderCheckpoints([
          ...current.checkpoints,
          { ...newCheckpoint, map_latitude: latlng.lat, map_longitude: latlng.lng, is_route_endpoint_default: false },
        ]),
      }));
      setAddingCheckpoint(false);
      setNewCheckpoint(DEFAULT_CHECKPOINT);
    }
  }, [addingCheckpoint, newCheckpoint, routeState.isDrawing, selectedSession]);

  const applyTemplate = () => {
    const template = ROUTE_TEMPLATES[routeState.template];
    if (!template) return;
    setRouteState((current) => ({
      ...current,
      routeName: template.name,
      routePoints: template.routePoints,
      checkpoints: buildTemplateCheckpoints(template),
      success: '',
      warning: 'Template loaded locally. Save to persist it, then verify the suggested start/end defaults and any intermediate checkpoints.',
    }));
  };


  const searchLocation = async () => {
    if (!routeState.searchQuery) return;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(routeState.searchQuery)}`);
    const results = await response.json();
    const first = results?.[0];
    setRouteState((current) => ({ ...current, searchResults: results, success: '', warning: first ? '' : 'No matching location found. Try a fuller street address, city, or landmark name.' }));
    if (first) setFocusedSearchPoint({ lat: Number(first.lat), lng: Number(first.lon) });
  };

  const moveCheckpoint = async (index, direction) => {
    const next = [...routeState.checkpoints];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    const resequenced = orderCheckpoints(next);
    setRouteState((current) => ({ ...current, success: '', checkpoints: resequenced }));
    await resequencePersistedCheckpoints(resequenced);
  };

  const onDragEnd = async ({ source, destination }) => {
    if (!destination || source.index === destination.index) return;
    const next = [...routeState.checkpoints];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    const resequenced = orderCheckpoints(next);
    setRouteState((current) => ({ ...current, success: '', checkpoints: resequenced }));
    await resequencePersistedCheckpoints(resequenced);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Route Editor" description="Build, validate, and maintain route paths that link segment geography, capture sessions, and downstream marker workflows." />

      <DocumentationPageIntro instructionCards={instructions} guide={{ title: PAGE_GUIDANCE.route_editor.title, sections: PAGE_GUIDANCE.route_editor.sections }} />
      <NextStepPanel step={PAGE_GUIDANCE.route_editor.sections.nextStep} detail="Field crews will use checkpoint order directly, so make sure the saved route reflects the actual travel path." />

      <FutureReadyPanel
        title="Route-to-media sync readiness"
        description="These notes show how the current in-house route editor already supports later automation without changing the operational model today."
        items={[{
          key: 'routeSync',
          title: 'Checkpoint-driven sync envelope',
          status: syncEnvelope.syncStatus,
          summary: `This route currently exposes ${syncEnvelope.checkpointCount} checkpoint references for session ${syncEnvelope.sessionId || 'not selected'} and can support downstream review handoff once the path and checkpoints are stable.`,
          workflow: 'Field timing, session media, and future sync services compute timestamp alignment only after both are stable.',
          entities: ['RoutePath', 'RouteCheckpoint', 'CaptureSession', 'MediaFile', 'MediaMarker'],
          extensionPoints: syncEnvelope.futureComputationNotes,
        }]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <RouteSummaryCards routeSummary={routeSummary} validationWarnings={validationWarnings} selectedProject={selectedProject} selectedSegment={selectedSegment} selectedSession={selectedSession} />

          <Card className="overflow-hidden">
            <CardHeader className="pb-3"><CardTitle className="text-base">Interactive Route Map</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="h-[560px] overflow-hidden rounded-xl border">
                <MapContainer center={[34.0522, -118.2437]} zoom={14} minZoom={3} maxZoom={21} className="h-full w-full" scrollWheelZoom>
                  <MapViewportController focusPoint={focusedSearchPoint} />
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {routeState.routePoints.length > 1 && <Polyline positions={routeState.routePoints} color="#2563eb" weight={4} />}
                  {routeState.routePoints.map((point, index) => (
                    <Marker key={`route-point-${index}`} position={[point.lat, point.lng]} draggable eventHandlers={{ dragend: (event) => { const nextLatLng = event.target.getLatLng(); setRouteState((current) => ({ ...current, success: '', routePoints: current.routePoints.map((item, itemIndex) => itemIndex === index ? { lat: nextLatLng.lat, lng: nextLatLng.lng } : item) })); } }}>
                      <Popup>Route point {index + 1}{index === 0 ? ' · Start anchor' : index === routeState.routePoints.length - 1 ? ' · End anchor' : ''}</Popup>
                    </Marker>
                  ))}
                  {routeState.checkpoints.filter((checkpoint) => checkpoint.map_latitude && checkpoint.map_longitude).map((checkpoint, index) => (
                    <Marker key={checkpoint.id || `checkpoint-${index}`} position={[checkpoint.map_latitude, checkpoint.map_longitude]} draggable={!checkpoint.is_route_endpoint_default} eventHandlers={{ dragend: (event) => { const nextLatLng = event.target.getLatLng(); setRouteState((current) => ({ ...current, success: '', checkpoints: current.checkpoints.map((item, itemIndex) => itemIndex === index ? { ...item, map_latitude: nextLatLng.lat, map_longitude: nextLatLng.lng } : item) })); if (checkpoint.id && !String(checkpoint.id).startsWith('template-')) updateCheckpointMut.mutate({ checkpointId: checkpoint.id, data: { map_latitude: nextLatLng.lat, map_longitude: nextLatLng.lng } }); } }}>
                      <Popup>#{index + 1} · {checkpoint.checkpoint_label}</Popup>
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
          <RouteSetupPanel
            projects={projects}
            projectSegments={projectSegments}
            segmentSessions={segmentSessions}
            state={routeState}
            setState={setRouteState}
            selectedProject={selectedProject}
            selectedSegment={selectedSegment}
            selectedSession={selectedSession}
            onApplyTemplate={applyTemplate}
            onToggleDrawing={() => setRouteState((current) => ({ ...current, isDrawing: !current.isDrawing }))}
            onSearchLocation={searchLocation}
            onUndoLastPoint={() => setRouteState((current) => ({ ...current, routePoints: current.routePoints.slice(0, -1) }))}
            onSave={() => saveRouteMut.mutate()}
            validationWarnings={validationWarnings}
            routeSuggestion={routeSuggestion}
          />

          <CheckpointBuilder
            checkpoints={routeState.checkpoints}
            setCheckpoints={(next) => setRouteState((current) => ({ ...current, checkpoints: typeof next === 'function' ? next(current.checkpoints) : next }))}
            addingCheckpoint={addingCheckpoint}
            setAddingCheckpoint={setAddingCheckpoint}
            newCheckpoint={newCheckpoint}
            setNewCheckpoint={setNewCheckpoint}
            selectedSessionId={routeState.sessionId}
            updateCheckpointMut={updateCheckpointMut}
            deleteCheckpointMut={deleteCheckpointMut}
            moveCheckpoint={moveCheckpoint}
            onDragEnd={onDragEnd}
            routeSuggestion={routeSuggestion}
          />

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Route warning review</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {validationWarnings.length === 0 ? <p className="text-sm text-muted-foreground">No active warnings. This route appears operationally complete for handoff.</p> : validationWarnings.map((warning) => <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning}</div>)}
            </CardContent>
          </Card>

          <InstructionPanel instructions={instructions.filter((instruction) => instruction.instruction_category === 'qa' || instruction.instruction_category === 'mapping')} />
        </div>
      </div>
    </div>
  );
}
