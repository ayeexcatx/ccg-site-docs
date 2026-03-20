import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DocumentationPageIntro, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { logFieldSessionEvent } from '@/lib/base44Workflows';
import { getFieldSessionSummary } from '@/lib/domainWorkflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { formatTimestamp, getWorkflowStateLabel } from '@/lib/displayUtils';
import { Clock, CornerDownRight, Landmark, Pause, Play, Square, StickyNote, Crosshair } from 'lucide-react';

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
    const interval = setInterval(() => {
      setTimer((current) => ({ ...current, elapsed: current.pausedElapsed + Math.floor((Date.now() - current.startTime) / 1000) }));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTime]);

  useEffect(() => {
    if (!activeSession) {
      setTimer({ isRunning: false, isPaused: false, startTime: null, pausedElapsed: 0, elapsed: 0 });
    }
  }, [activeSession?.id]);

  return {
    timer,
    start: () => setTimer({ isRunning: true, isPaused: false, startTime: Date.now(), pausedElapsed: 0, elapsed: 0 }),
    togglePause: () => setTimer((current) => current.isPaused
      ? { ...current, isPaused: false, startTime: Date.now() }
      : { ...current, isPaused: true, pausedElapsed: current.elapsed }),
    stop: () => setTimer((current) => ({ ...current, isRunning: false, isPaused: false, startTime: null, pausedElapsed: current.elapsed })),
  };
}

function SessionSelectionCard({ sessions, selectedSessionId, setSelectedSessionId, activeSession, onStart, isRunning }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Session Selection</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedSessionId || 'none'} onValueChange={(value) => setSelectedSessionId(value === 'none' ? '' : value)}>
          <SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name} ({getWorkflowStateLabel(session.session_status)})</SelectItem>)}</SelectContent>
        </Select>
        {activeSession && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p><p className="text-sm font-medium">{activeSession.project_id || 'Attached in Base44'}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Segment</p><p className="text-sm font-medium">{activeSession.street_segment_id || 'Assigned segment'}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p><p className="text-sm font-medium">{activeSession.capture_method || 'Manual capture'}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p><p className="text-sm font-medium">{getWorkflowStateLabel(activeSession.session_status)}</p></div>
          </div>
        )}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-1 text-sm font-medium">Session Instructions</p>
          <p className="text-sm leading-6 text-muted-foreground">Stay aligned to the approved route, avoid logging duplicate events for the same location unless a retake or issue truly occurred, and use pause/resume only when the capture flow is interrupted. Notes should describe what changed, what was missed, or what the reviewer should confirm next.</p>
        </div>
        {!isRunning && <Button className="h-14 w-full gap-3 text-lg" onClick={onStart} disabled={!activeSession}><Play className="h-6 w-6" /> Start Session</Button>}
      </CardContent>
    </Card>
  );
}

export default function FieldSession() {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [note, setNote] = useState('');
  const [completedSummary, setCompletedSummary] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('field_session');

  const { data: sessions = [] } = useQuery({ queryKey: ['field-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 100) });
  const { data: routeCheckpoints = [] } = useQuery({ queryKey: ['field-checkpoints', selectedSessionId], queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const { data: storedEvents = [] } = useQuery({ queryKey: ['field-events', selectedSessionId], queryFn: () => base44.entities.FieldSessionEvent.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });

  const activeSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [sessions, selectedSessionId]);
  const { timer, start, togglePause, stop } = useFieldSessionTimer(activeSession);
  const sessionSummary = useMemo(() => getFieldSessionSummary({ checkpoints: routeCheckpoints, events: [...storedEvents, ...localEvents] }), [routeCheckpoints, storedEvents, localEvents]);
  const sessionEvents = sessionSummary.orderedEvents;
  const groupedEvents = sessionSummary.groupedEvents;

  const createEventMut = useMutation({
    mutationFn: ({ eventType, eventLabel, eventNote, seconds }) => logFieldSessionEvent({ session: activeSession, eventType, eventLabel, eventNote, timestampOffsetSeconds: seconds }),
    onSuccess: (event) => {
      setLocalEvents((current) => [...current, event]);
      queryClient.invalidateQueries({ queryKey: ['field-events', selectedSessionId] });
    },
  });

  const updateSessionMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data) });

  const recordEvent = (eventType, eventLabel, eventNote = note) => {
    if (!activeSession) return;
    createEventMut.mutate({ eventType, eventLabel, eventNote, seconds: timer.elapsed });
    setNote('');
  };

  const handleStart = () => {
    if (!activeSession) return;
    start();
    setCompletedSummary(null);
    setLocalEvents([]);
    createEventMut.mutate({ eventType: 'session_start', eventLabel: 'Session Started', eventNote: '', seconds: 0 });
    updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'in_progress', actual_start_time: new Date().toISOString() } });
  };

  const handlePauseResume = () => {
    if (!timer.isRunning) return;
    const nextEvent = timer.isPaused ? ['session_resume', 'Session Resumed'] : ['session_pause', 'Session Paused'];
    togglePause();
    recordEvent(nextEvent[0], nextEvent[1]);
  };

  const handleFinish = () => {
    if (!activeSession) return;
    const finalElapsed = timer.elapsed;
    recordEvent('session_end', 'Session Ended');
    updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'uploaded', actual_end_time: new Date().toISOString() } });
    stop();
    const completedSessionSummary = getFieldSessionSummary({ checkpoints: routeCheckpoints, events: [...sessionEvents, { event_type: 'session_end', timestamp_offset_seconds: finalElapsed }], finalElapsedSeconds: finalElapsed });
    setCompletedSummary(completedSessionSummary);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Field Session" description="Capture field-session timing and event data with a large-button workflow that remains simple under real field conditions." />

      <DocumentationPageIntro
        instructionCards={instructions}
        header={{
          title: 'Field Session Operating Overview',
          purpose: 'This page records the timing spine for an active field run so later QA and marker estimation can reconstruct what happened on-site.',
          role: 'Documenters and field leads use this during capture. Reviewers and project admins consume the resulting event trail during QA and publication prep.',
          workflowSummary: 'Select the approved session, start at actual capture start, log only meaningful reference events, pause only for real interruptions, then finish and hand the event history downstream.',
          visibilityRules: 'Everything logged here is internal operational data. Notes should be review-ready but never treated as client-safe copy without translation and approval.',
          nextSteps: 'After finish, upload media, review estimated checkpoint timing, and reconcile any coverage gaps in Marker Review or project QA.'
        }}
        guide={{
          title: 'Field Workflow Guide',
          description: 'This page stays intentionally simple for in-field use, but the timer and event model remain aligned with the current Base44 workflow so later automation can build on it safely.',
          sections: [
            { heading: 'Required Discipline', body: 'Start the timer when capture actually begins. Pause only for real stoppages, and use issue notes whenever a reviewer would otherwise wonder why coverage changed.' },
            { heading: 'Future-ready Design', body: 'Accurate event timing here supports future map-video sync, route-assisted review, and AI-assisted tagging without changing the current field process.' },
          ],
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <SessionSelectionCard sessions={sessions} selectedSessionId={selectedSessionId} setSelectedSessionId={setSelectedSessionId} activeSession={activeSession} onStart={handleStart} isRunning={timer.isRunning} />

          {timer.isRunning && (
            <>
              <Card>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><span className="text-3xl font-mono font-bold tracking-wider">{formatTimestamp(timer.elapsed)}</span></div>
                    <Badge variant={timer.isPaused ? 'destructive' : 'default'}>{timer.isPaused ? 'Paused — timer stopped until you resume' : 'Recording — timer running'}</Badge>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                    <Button variant="outline" className="h-12" onClick={handlePauseResume}><Pause className="mr-2 h-4 w-4" /> {timer.isPaused ? 'Resume' : 'Pause'}</Button>
                    <Button variant="destructive" className="h-12" onClick={handleFinish}><Square className="mr-2 h-4 w-4" /> Finish</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {EVENT_BUTTONS.map((button) => (
                  <Button key={button.type} onClick={() => recordEvent(button.type, button.label)} className={`flex h-24 flex-col items-center justify-center gap-2 text-base font-semibold text-white ${button.color}`} disabled={timer.isPaused}>
                    <button.icon className="h-6 w-6" />
                    {button.label}
                  </Button>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Optional Note for Next Event</CardTitle></CardHeader>
                <CardContent><Textarea placeholder="Describe what staff or QA reviewers should know about the next event you log." value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24" /></CardContent>
              </Card>
            </>
          )}

          {completedSummary && (
            <Card>
              <CardHeader><CardTitle className="text-base">Post-Session Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Total recorded duration: <span className="font-medium text-foreground">{formatTimestamp(completedSummary.totalDuration)}</span>.</p>
                <p>Total logged events: <span className="font-medium text-foreground">{completedSummary.totalEvents}</span>.</p>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 font-medium text-foreground">Review reminder</p>
                  <p>Upload media, compare route checkpoints to event timing estimates, and flag any gaps before project reviewers begin marker confirmation.</p>
                </div>
                <div className="space-y-2">
                  {completedSummary.estimatedTimeline.slice(0, 5).map((item) => (
                    <div key={item.checkpoint_id || item.checkpoint_label} className="flex justify-between gap-4 rounded border p-2">
                      <span className="text-foreground">{item.checkpoint_label}</span>
                      <span>{item.estimated_timestamp_seconds !== null ? formatTimestamp(item.estimated_timestamp_seconds) : 'No estimate'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <WorkflowStepsPanel title="Expected Field Workflow" steps={[
            { title: 'Confirm session details', description: 'Before starting, verify the session, route intent, and capture method so the timer aligns with the correct deliverable.' },
            { title: 'Log only meaningful events', description: 'Use event buttons when the team reaches a reference point or issue that will matter during marker review.' },
            { title: 'Close with a usable summary', description: 'Finish the session only after notes and significant interruptions are captured clearly enough for downstream reviewers.' },
          ]} />
          <QAReviewChecklist items={[
            { title: 'Timer discipline', description: 'Confirm the timer start, pauses, and finish reflect actual capture behavior rather than administrative cleanup afterward.' },
            { title: 'Event signal quality', description: 'Use concise event labels and note text that help QA understand what happened without over-documenting minor noise.' },
            { title: 'Checkpoint estimation review', description: 'Review the completion summary so event timing stays plausible against the planned route before media review begins.' },
          ]} />
          <VisibilityRulesPanel title="Internal-only Data Reminder" rules={[
            { title: 'Field notes are internal', description: 'All event notes, pause reasons, and reviewer-oriented language remain internal unless deliberately rewritten for client communication later.' },
            { title: 'Do not copy raw field language to clients', description: 'Even when facts are useful later, staff should rewrite that context into client-facing summaries after internal QA.' },
          ]} />

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Event History by Type</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedEvents).map(([group, items]) => (
                <div key={group} className="space-y-2">
                  <p className="text-sm font-medium">{EVENT_GROUP_LABELS[group]}</p>
                  {items.length === 0 ? <p className="text-sm text-muted-foreground">No events in this group yet.</p> : items.map((event, index) => (
                    <div key={`${group}-${index}`} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{event.event_label || event.event_type}</p>
                        <Badge variant="outline">{formatTimestamp(event.timestamp_offset_seconds || 0)}</Badge>
                      </div>
                      {event.event_note && <p className="mt-1 leading-6 text-muted-foreground">{event.event_note}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          <InstructionPanel instructions={instructions} />
        </div>
      </div>
    </div>
  );
}
