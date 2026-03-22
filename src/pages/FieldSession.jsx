import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { logFieldSessionEvent } from '@/lib/base44Workflows';
import { getFieldSessionSummary, getFieldSessionViewModel, getGpsTrackingSessionSummary } from '@/lib/domainWorkflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { formatTimestamp, getWorkflowStateLabel } from '@/lib/displayUtils';
import { appendGpsSample, clearStoredGpsSession, loadStoredGpsSession } from '@/lib/gpsWorkflow';
import { Activity, CornerDownRight, Landmark, Pause, Play, Square, StickyNote, Crosshair, LocateFixed } from 'lucide-react';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';

const EVENT_GROUP_LABELS = {
  lifecycle: 'Session Lifecycle',
  checkpoints: 'Checkpoint Events',
  notes: 'Issue / Note Events',
};
const EVENT_BUTTONS = [
  { type: 'intersection', label: 'Intersection', icon: Crosshair, color: 'bg-blue-600 hover:bg-blue-700' },
  { type: 'landmark', label: 'Landmark', icon: Landmark, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { type: 'curb_ramp', label: 'Curb Ramp', icon: CornerDownRight, color: 'bg-amber-600 hover:bg-amber-700' },
  { type: 'issue_note', label: 'Issue Note', icon: StickyNote, color: 'bg-rose-600 hover:bg-rose-700' },
];

function useFieldSessionTimer(activeSession) {
  const [timer, setTimer] = useState({ isRunning: false, isPaused: false, startTime: null, pausedElapsed: 0, elapsed: 0 });
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || !timer.startTime) return undefined;
    const interval = setInterval(() => setTimer((current) => ({ ...current, elapsed: current.pausedElapsed + Math.floor((Date.now() - current.startTime) / 1000) })), 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTime]);
  useEffect(() => { if (!activeSession) setTimer({ isRunning: false, isPaused: false, startTime: null, pausedElapsed: 0, elapsed: 0 }); }, [activeSession?.id]);
  return {
    timer,
    start: () => setTimer({ isRunning: true, isPaused: false, startTime: Date.now(), pausedElapsed: 0, elapsed: 0 }),
    togglePause: () => setTimer((current) => current.isPaused ? { ...current, isPaused: false, startTime: Date.now() } : { ...current, isPaused: true, pausedElapsed: current.elapsed }),
    stop: () => setTimer((current) => ({ ...current, isRunning: false, isPaused: false, startTime: null, pausedElapsed: current.elapsed })),
  };
}

function useGpsTracking(sessionId, isEnabled) {
  const [gpsSamples, setGpsSamples] = useState(() => loadStoredGpsSession(sessionId));
  const [gpsStatus, setGpsStatus] = useState({ active: false, supported: typeof navigator !== 'undefined' && 'geolocation' in navigator, error: '' });

  useEffect(() => {
    setGpsSamples(loadStoredGpsSession(sessionId));
  }, [sessionId]);

  useEffect(() => {
    if (!isEnabled || !sessionId) {
      setGpsStatus((current) => ({ ...current, active: false }));
      return undefined;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus({ active: false, supported: false, error: 'GPS is not available in this browser.' });
      return undefined;
    }

    // GPS sample collection is persisted locally so field sessions can keep suggested
    // checkpoint matching and cut-point review data even before a dedicated backend
    // telemetry pipeline is introduced.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsSamples(appendGpsSample(sessionId, position.coords));
        setGpsStatus({ active: true, supported: true, error: '' });
      },
      (error) => setGpsStatus({ active: false, supported: true, error: error.message || 'Unable to access GPS.' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    setGpsStatus({ active: true, supported: true, error: '' });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isEnabled, sessionId]);

  return { gpsSamples, gpsStatus, clearGpsSamples: () => { clearStoredGpsSession(sessionId); setGpsSamples([]); } };
}

function SessionSelectionCard({ sessions, selectedSessionId, setSelectedSessionId, activeSession, onStart, isRunning, checkpointCount, gpsStatus }) {
  return <Card><CardHeader><CardTitle className="text-base">Session Selection</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={selectedSessionId || 'none'} onValueChange={(value) => setSelectedSessionId(value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger><SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name} ({getWorkflowStateLabel(session.session_status)})</SelectItem>)}</SelectContent></Select>{activeSession && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p><p className="text-sm font-medium">{activeSession.project_id || 'Attached in Base44'}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Segment</p><p className="text-sm font-medium">{activeSession.street_segment_id || 'Assigned segment'}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p><p className="text-sm font-medium">{activeSession.capture_method || 'Manual capture'}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Checkpoint plan</p><p className="text-sm font-medium">{checkpointCount} checkpoint{checkpointCount === 1 ? '' : 's'}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPS</p><p className="text-sm font-medium">{gpsStatus.active ? 'Tracking active' : gpsStatus.supported ? 'Ready when started' : 'Unavailable'}</p></div></div>}{!isRunning && <Button className="h-14 w-full gap-3 text-lg" onClick={onStart} disabled={!activeSession}><Play className="h-6 w-6" /> Start Session</Button>}</CardContent></Card>;
}

function ActiveSessionState({ activeSession, timer, handlePauseResume, handleFinish, checkpointCount, nextExpectedCheckpoint, manualCheckpointId, setManualCheckpointId, routeCheckpoints, gpsStatus, gpsSummary }) {
  const gpsSuggestedCheckpoint = gpsSummary.checkpointMatches.find((match) => ['high', 'medium'].includes(match.confidence));
  return <Card className="border-primary/20 shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-2 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><span className="text-3xl font-mono font-bold tracking-wider">{formatTimestamp(timer.elapsed)}</span></div><div className="flex flex-wrap gap-2"><Badge variant={timer.isPaused ? 'destructive' : 'default'}>{timer.isPaused ? 'Paused — timer stopped until resumed' : 'Active — timing in progress'}</Badge><Badge variant="outline">{activeSession?.session_name || 'No session selected'}</Badge><Badge variant="outline">{checkpointCount} planned checkpoint{checkpointCount === 1 ? '' : 's'}</Badge><Badge variant="outline">{gpsStatus.active ? 'GPS active' : gpsStatus.supported ? 'GPS waiting' : 'GPS unavailable'}</Badge></div></div><div className="grid w-full grid-cols-2 gap-3 lg:w-auto"><Button variant="outline" className="h-12" onClick={handlePauseResume}><Pause className="mr-2 h-4 w-4" /> {timer.isPaused ? 'Resume' : 'Pause'}</Button><Button variant="destructive" className="h-12" onClick={handleFinish}><Square className="mr-2 h-4 w-4" /> Finish</Button></div></div><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl border bg-primary/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Next Expected Checkpoint</p><p className="mt-2 text-sm font-semibold text-foreground">{gpsSuggestedCheckpoint?.checkpoint_label || nextExpectedCheckpoint?.checkpoint_label || 'No planned checkpoint left'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{gpsSuggestedCheckpoint ? `GPS suggests this checkpoint with ${gpsSuggestedCheckpoint.confidence} confidence.` : 'The system will pair the next tap with the next planned checkpoint unless you manually override it.'}</p><Select value={manualCheckpointId || 'auto'} onValueChange={(value) => setManualCheckpointId(value === 'auto' ? '' : value)}><SelectTrigger className="mt-3"><SelectValue placeholder="Automatic pairing" /></SelectTrigger><SelectContent><SelectItem value="auto">Automatic pairing</SelectItem>{routeCheckpoints.map((checkpoint) => <SelectItem key={checkpoint.id} value={checkpoint.id}>{checkpoint.sequence_order + 1}. {checkpoint.checkpoint_label}</SelectItem>)}</SelectContent></Select></div><div className="rounded-xl border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPS sample count</p><p className="mt-2 text-2xl font-semibold">{gpsSummary.totalSamples}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Samples are recorded while the session is active and reused later for checkpoint and cut-point suggestions.</p></div><div className="rounded-xl border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Route progress</p><p className="mt-2 text-2xl font-semibold">{gpsSummary.lastKnownProgress.progressPercent || 0}%</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{gpsSummary.lastKnownProgress.distanceMeters !== null ? `${gpsSummary.lastKnownProgress.distanceMeters}m from nearest planned route point.` : 'Waiting for GPS samples.'}</p></div></div>{gpsStatus.error && <p className="text-sm text-amber-700">{gpsStatus.error}</p>}</CardContent></Card>;
}

export default function FieldSession() {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [note, setNote] = useState('');
  const [completedSummary, setCompletedSummary] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const [manualCheckpointId, setManualCheckpointId] = useState('');
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('field_session');
  const { data: sessions = [] } = useQuery({ queryKey: ['field-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 100) });
  const { data: routeCheckpoints = [] } = useQuery({ queryKey: ['field-checkpoints', selectedSessionId], queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const { data: storedEvents = [] } = useQuery({ queryKey: ['field-events', selectedSessionId], queryFn: () => base44.entities.FieldSessionEvent.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const { data: routePaths = [] } = useQuery({ queryKey: ['field-routes', selectedSessionId], queryFn: () => base44.entities.RoutePath.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const activeSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [sessions, selectedSessionId]);
  const { timer, start, togglePause, stop } = useFieldSessionTimer(activeSession);
  const { gpsSamples, gpsStatus, clearGpsSamples } = useGpsTracking(selectedSessionId, timer.isRunning && !timer.isPaused);
  const routePoints = useMemo(() => {
    try {
      return JSON.parse(routePaths[0]?.polyline_json || '[]');
    } catch {
      return [];
    }
  }, [routePaths]);
  const fieldSessionViewModel = useMemo(() => getFieldSessionViewModel({ checkpoints: routeCheckpoints, storedEvents, localEvents, timer }), [routeCheckpoints, storedEvents, localEvents, timer]);
  const usedCheckpointIds = useMemo(() => [...storedEvents, ...localEvents].map((event) => event.checkpoint_reference).filter(Boolean), [storedEvents, localEvents]);
  const nextExpectedCheckpoint = useMemo(() => routeCheckpoints.find((checkpoint) => !usedCheckpointIds.includes(checkpoint.id)) || null, [routeCheckpoints, usedCheckpointIds]);
  const gpsSummary = useMemo(() => getGpsTrackingSessionSummary({ sessionId: selectedSessionId, gpsSamples, checkpoints: routeCheckpoints, routePoints }), [selectedSessionId, gpsSamples, routeCheckpoints, routePoints]);
  const { sessionSummary, groupedEvents, eventCards } = fieldSessionViewModel;
  const sessionEvents = sessionSummary.orderedEvents;

  const createEventMut = useMutation({ mutationFn: ({ eventType, eventLabel, eventNote, seconds }) => logFieldSessionEvent({ session: activeSession, eventType, eventLabel, eventNote, timestampOffsetSeconds: seconds }), onSuccess: (event) => { setLocalEvents((current) => [...current, event]); queryClient.invalidateQueries({ queryKey: ['field-events', selectedSessionId] }); } });
  const updateSessionMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data) });
  const gpsSuggestedCheckpoint = useMemo(() => {
    const suggested = gpsSummary.checkpointMatches.find((match) => ['high', 'medium'].includes(match.confidence));
    return routeCheckpoints.find((checkpoint) => checkpoint.id === suggested?.checkpoint_id) || null;
  }, [gpsSummary.checkpointMatches, routeCheckpoints]);
  const recordEvent = (eventType, eventLabel, eventNote = note) => { if (!activeSession) return; const pairedCheckpoint = routeCheckpoints.find((checkpoint) => checkpoint.id === manualCheckpointId) || gpsSuggestedCheckpoint || nextExpectedCheckpoint; const checkpointSuffix = pairedCheckpoint ? ` → ${pairedCheckpoint.checkpoint_label}` : ''; const normalizedNote = [eventNote, pairedCheckpoint ? `Paired checkpoint: ${pairedCheckpoint.checkpoint_label}` : '', gpsSuggestedCheckpoint ? `GPS suggestion confidence: ${gpsSummary.checkpointMatches.find((match) => match.checkpoint_id === gpsSuggestedCheckpoint.id)?.confidence || 'unknown'}` : ''].filter(Boolean).join('\n'); createEventMut.mutate({ eventType, eventLabel: `${eventLabel}${checkpointSuffix}`, eventNote: normalizedNote, seconds: timer.elapsed }); setManualCheckpointId(''); setNote(''); };
  const handleStart = () => { if (!activeSession) return; clearGpsSamples(); start(); setCompletedSummary(null); setLocalEvents([]); createEventMut.mutate({ eventType: 'session_start', eventLabel: 'Session Started', eventNote: '', seconds: 0 }); updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'recording_in_progress', actual_start_time: new Date().toISOString() } }); };
  const handlePauseResume = () => { if (!timer.isRunning) return; const nextEvent = timer.isPaused ? ['session_resume', 'Session Resumed'] : ['session_pause', 'Session Paused']; togglePause(); recordEvent(nextEvent[0], nextEvent[1]); };
  const handleFinish = () => { if (!activeSession) return; const finalElapsed = timer.elapsed; recordEvent('session_end', 'Session Ended'); updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'recordings_uploaded', actual_end_time: new Date().toISOString() } }); stop(); setCompletedSummary({ ...getFieldSessionSummary({ checkpoints: routeCheckpoints, events: [...sessionEvents, { event_type: 'session_end', timestamp_offset_seconds: finalElapsed }], finalElapsedSeconds: finalElapsed }), gpsSummary: getGpsTrackingSessionSummary({ sessionId: selectedSessionId, gpsSamples, checkpoints: routeCheckpoints, routePoints }) }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Field Session" description="Capture field-session timing and event data with a large-button workflow that remains simple under real field conditions." />
      <DocumentationPageIntro instructionCards={instructions} guide={{ title: PAGE_GUIDANCE.field_session.title, sections: PAGE_GUIDANCE.field_session.sections }} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]"><div className="space-y-6"><SessionSelectionCard sessions={sessions} selectedSessionId={selectedSessionId} setSelectedSessionId={setSelectedSessionId} activeSession={activeSession} onStart={handleStart} isRunning={timer.isRunning} checkpointCount={routeCheckpoints.length} gpsStatus={gpsStatus} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{eventCards.map((card) => <div key={card.label} className="rounded-xl border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.detail}</p></div>)}</div>{timer.isRunning && <><ActiveSessionState activeSession={activeSession} timer={timer} handlePauseResume={handlePauseResume} handleFinish={handleFinish} checkpointCount={routeCheckpoints.length} nextExpectedCheckpoint={nextExpectedCheckpoint} manualCheckpointId={manualCheckpointId} setManualCheckpointId={setManualCheckpointId} routeCheckpoints={routeCheckpoints} gpsStatus={gpsStatus} gpsSummary={gpsSummary} /><div className="grid grid-cols-2 gap-3">{EVENT_BUTTONS.map((button) => <Button key={button.type} onClick={() => recordEvent(button.type, button.label)} className={`flex h-24 flex-col items-center justify-center gap-2 text-base font-semibold text-white ${button.color}`} disabled={timer.isPaused}><button.icon className="h-6 w-6" />{button.label}</Button>)}</div><Card><CardHeader className="pb-3"><CardTitle className="text-base">Optional Note for Next Event</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="Describe what staff or QA reviewers should know about the next event you log." value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24" /></CardContent></Card></>}{(completedSummary || selectedSessionId) && <Card><CardHeader><CardTitle className="text-base">Post-Session Summary</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p><p className="mt-1 text-lg font-semibold text-foreground">{formatTimestamp((completedSummary || sessionSummary).totalDuration || timer.elapsed)}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Events logged</p><p className="mt-1 text-lg font-semibold text-foreground">{(completedSummary || sessionSummary).totalEvents}</p></div><div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPS samples</p><p className="mt-1 text-lg font-semibold text-foreground">{(completedSummary?.gpsSummary || gpsSummary).totalSamples}</p></div></div><div className="space-y-2"><p className="font-medium text-foreground">Suggested checkpoint matches</p>{(completedSummary?.gpsSummary || gpsSummary).checkpointMatches.length === 0 ? <p>No GPS-based checkpoint suggestions yet.</p> : (completedSummary?.gpsSummary || gpsSummary).checkpointMatches.map((item) => <div key={item.checkpoint_id || item.checkpoint_label} className="flex justify-between gap-4 rounded border p-2"><span className="text-foreground">{item.checkpoint_label}</span><span>{item.estimated_timestamp ? new Date(item.estimated_timestamp).toLocaleTimeString() : 'No estimate'} · {item.confidence}</span></div>)}</div><div className="space-y-2"><p className="font-medium text-foreground">Suggested cut points</p>{(completedSummary?.gpsSummary || gpsSummary).suggestedCutPoints.length === 0 ? <p>No suggested cut points yet.</p> : (completedSummary?.gpsSummary || gpsSummary).suggestedCutPoints.map((item) => <div key={item.segment_id || item.segment_label} className="rounded border p-3"><p className="font-medium text-foreground">{item.segment_label}</p><p className="text-xs text-muted-foreground">Start {item.suggested_start_timestamp ? new Date(item.suggested_start_timestamp).toLocaleTimeString() : 'No estimate'} · End {item.suggested_end_timestamp ? new Date(item.suggested_end_timestamp).toLocaleTimeString() : 'No estimate'} · {item.confidence} confidence</p></div>)}</div></CardContent></Card>}</div><div className="space-y-6"><Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><LocateFixed className="h-4 w-4 text-primary" /> Event History by Type</CardTitle></CardHeader><CardContent className="space-y-5">{Object.entries(groupedEvents).map(([group, items]) => <div key={group} className="space-y-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{EVENT_GROUP_LABELS[group]}</p><Badge variant="outline">{items.length}</Badge></div>{items.length === 0 ? <p className="text-sm text-muted-foreground">No events in this group yet.</p> : items.map((event, index) => <div key={`${group}-${index}`} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-3"><p className="font-medium">{event.event_label || event.event_type}</p><Badge variant="outline">{formatTimestamp(event.timestamp_offset_seconds || 0)}</Badge></div>{event.event_note && <p className="mt-1 leading-6 text-muted-foreground">{event.event_note}</p>}</div>)}</div>)}</CardContent></Card></div></div>
    </div>
  );
}
