import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { OperatingGuide, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { estimateCheckpointTimestampsFromSessionEvents, logFieldSessionEvent } from '@/lib/base44Workflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { Clock, CornerDownRight, Landmark, Pause, Play, Square, StickyNote, Crosshair } from 'lucide-react';

const EVENT_GROUP_LABELS = {
  lifecycle: 'Session Lifecycle',
  checkpoints: 'Checkpoint Events',
  notes: 'Issue / Note Events',
};

export default function FieldSession() {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [note, setNote] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const queryClient = useQueryClient();
  const { data: instructions = [] } = usePageInstructions('field_session');

  const { data: sessions = [] } = useQuery({ queryKey: ['field-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 100) });
  const { data: routeCheckpoints = [] } = useQuery({ queryKey: ['field-checkpoints', selectedSessionId], queryFn: () => base44.entities.RouteCheckpoint.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });
  const { data: storedEvents = [] } = useQuery({ queryKey: ['field-events', selectedSessionId], queryFn: () => base44.entities.FieldSessionEvent.filter({ capture_session_id: selectedSessionId }), enabled: !!selectedSessionId });

  const activeSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [sessions, selectedSessionId]);
  const sessionEvents = useMemo(() => [...storedEvents, ...localEvents].sort((a, b) => (a.timestamp_offset_seconds || 0) - (b.timestamp_offset_seconds || 0)), [storedEvents, localEvents]);

  const groupedEvents = useMemo(() => ({
    lifecycle: sessionEvents.filter((event) => ['session_start', 'session_pause', 'session_resume', 'session_end'].includes(event.event_type)),
    checkpoints: sessionEvents.filter((event) => ['intersection', 'landmark', 'curb_ramp'].includes(event.event_type)),
    notes: sessionEvents.filter((event) => ['issue_note'].includes(event.event_type)),
  }), [sessionEvents]);

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused && startTime) {
      interval = setInterval(() => setElapsed(pausedElapsed + Math.floor((Date.now() - startTime) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, pausedElapsed, startTime]);

  const createEventMut = useMutation({
    mutationFn: ({ eventType, eventLabel, eventNote }) => logFieldSessionEvent({ session: activeSession, eventType, eventLabel, eventNote, timestampOffsetSeconds: elapsed }),
    onSuccess: (event) => {
      setLocalEvents((current) => [...current, event]);
      queryClient.invalidateQueries({ queryKey: ['field-events', selectedSessionId] });
    },
  });

  const updateSessionMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data) });

  const formatTime = (seconds = 0) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const recordEvent = (eventType, eventLabel) => {
    if (!activeSession) return;
    createEventMut.mutate({ eventType, eventLabel, eventNote: note });
    setNote('');
  };

  const handleStart = () => {
    if (!activeSession) return;
    setIsRunning(true);
    setIsPaused(false);
    setPausedElapsed(0);
    setElapsed(0);
    setStartTime(Date.now());
    setCompletedSummary(null);
    setLocalEvents([]);
    createEventMut.mutate({ eventType: 'session_start', eventLabel: 'Session Started', eventNote: '' });
    updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'in_progress', actual_start_time: new Date().toISOString() } });
  };

  const handlePauseResume = () => {
    if (!isRunning) return;
    if (isPaused) {
      setIsPaused(false);
      setStartTime(Date.now());
      createEventMut.mutate({ eventType: 'session_resume', eventLabel: 'Session Resumed', eventNote: note });
    } else {
      setIsPaused(true);
      setPausedElapsed(elapsed);
      createEventMut.mutate({ eventType: 'session_pause', eventLabel: 'Session Paused', eventNote: note });
    }
    setNote('');
  };

  const handleFinish = () => {
    if (!activeSession) return;
    createEventMut.mutate({ eventType: 'session_end', eventLabel: 'Session Ended', eventNote: note });
    updateSessionMut.mutate({ id: activeSession.id, data: { session_status: 'uploaded', actual_end_time: new Date().toISOString() } });
    setIsRunning(false);
    setIsPaused(false);
    const estimatedTimeline = estimateCheckpointTimestampsFromSessionEvents({ checkpoints: routeCheckpoints, events: sessionEvents });
    setCompletedSummary({ totalDuration: elapsed, totalEvents: sessionEvents.length + 1, estimatedTimeline });
    setNote('');
  };

  const eventButtons = [
    { type: 'intersection', label: 'Intersection', icon: Crosshair, color: 'bg-blue-600 hover:bg-blue-700' },
    { type: 'landmark', label: 'Landmark', icon: Landmark, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { type: 'curb_ramp', label: 'Curb Ramp', icon: CornerDownRight, color: 'bg-amber-600 hover:bg-amber-700' },
    { type: 'issue_note', label: 'Issue Note', icon: StickyNote, color: 'bg-rose-600 hover:bg-rose-700' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Field Session" description="Capture field-session timing and event data with a large-button workflow that remains simple under real field conditions." />

      <OperatingGuide
        title="Field Workflow Guide"
        description="This page is the in-field logging screen for documenters. It should stay fast to use, but every button press now carries stronger operational context so timestamps remain review-ready later."
        instructionCards={instructions}
        sections={[
          { heading: 'Purpose', body: 'Use this page to run a live field capture session, record event timing, and create a structured event trail that can later estimate marker positions and support QA review.' },
          { heading: 'Who Uses This', body: 'Documenters and field leads use this page during active capture. Reviewers and project administrators use the resulting history to verify that the field walk matched the planned route.' },
          { heading: 'When To Use It', body: 'Open this page immediately before the field team begins a documented route. Pause it only for operational interruptions such as traffic delays, safety holds, or equipment resets.' },
          { heading: 'How It Works', body: ['Select the session, review the current session details and field instructions, then start the timer when capture begins.', 'Use the large buttons to log key events in real time. Optional notes should describe only what reviewers need to understand later.', 'When the route is complete, finish the session and review the post-session summary before handing media to upload and review staff.'] },
          { heading: 'Required Fields', body: 'A session selection is required. Event notes remain optional, but any irregularity, safety pause, or unusable capture moment should be documented before staff leave the site.' },
          { heading: 'QA / Review Checklist', body: 'Confirm the timer was started at actual capture start, pause/resume actions reflect real stoppages, issue notes explain any coverage gaps, and the completion summary is reviewed before closing out the session.' },
          { heading: 'Client Visibility Rules', body: 'Everything on this page is internal operational data. Field notes should assume internal audiences only and must not be copied directly into client-visible summaries without review.' },
          { heading: 'Related Next Steps', body: 'After completion, upload media, review marker estimates against route checkpoints, and remind reviewers to verify every notable event before publishing any project outputs.' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Session Selection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedSessionId || 'none'} onValueChange={(value) => setSelectedSessionId(value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name} ({session.session_status})</SelectItem>)}</SelectContent>
              </Select>
              {activeSession && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p><p className="text-sm font-medium">{activeSession.project_id || 'Attached in Base44'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Segment</p><p className="text-sm font-medium">{activeSession.street_segment_id || 'Assigned segment'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p><p className="text-sm font-medium">{activeSession.capture_method || 'Manual capture'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p><p className="text-sm font-medium">{activeSession.session_status}</p></div>
                </div>
              )}
              <div className="rounded-lg bg-muted/30 border p-4">
                <p className="text-sm font-medium mb-1">Session Instructions</p>
                <p className="text-sm text-muted-foreground leading-6">Stay aligned to the approved route, avoid logging duplicate events for the same location unless a retake or issue truly occurred, and use pause/resume only when the capture flow is interrupted. Notes should describe what changed, what was missed, or what the reviewer should confirm next.</p>
              </div>
              {!isRunning && <Button className="w-full h-14 text-lg gap-3" onClick={handleStart} disabled={!activeSession}><Play className="w-6 h-6" /> Start Session</Button>}
            </CardContent>
          </Card>

          {isRunning && (
            <>
              <Card>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-primary" /><span className="text-3xl font-mono font-bold tracking-wider">{formatTime(elapsed)}</span></div>
                    <Badge variant={isPaused ? 'destructive' : 'default'}>{isPaused ? 'Paused — timer stopped until you resume' : 'Recording — timer running'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                    <Button variant="outline" className="h-12" onClick={handlePauseResume}><Pause className="w-4 h-4 mr-2" /> {isPaused ? 'Resume' : 'Pause'}</Button>
                    <Button variant="destructive" className="h-12" onClick={handleFinish}><Square className="w-4 h-4 mr-2" /> Finish</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {eventButtons.map((button) => (
                  <Button key={button.type} onClick={() => recordEvent(button.type, button.label)} className={`h-24 text-base font-semibold text-white ${button.color} flex flex-col items-center justify-center gap-2`} disabled={isPaused}>
                    <button.icon className="w-6 h-6" />
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
                <p>Total recorded duration: <span className="font-medium text-foreground">{formatTime(completedSummary.totalDuration)}</span>.</p>
                <p>Total logged events: <span className="font-medium text-foreground">{completedSummary.totalEvents}</span>.</p>
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground mb-2">Review reminder</p>
                  <p>Upload media, compare route checkpoints to event timing estimates, and flag any gaps before project reviewers begin marker confirmation.</p>
                </div>
                <div className="space-y-2">
                  {completedSummary.estimatedTimeline.slice(0, 5).map((item) => (
                    <div key={item.checkpoint_id || item.checkpoint_label} className="flex justify-between gap-4 rounded border p-2">
                      <span className="text-foreground">{item.checkpoint_label}</span>
                      <span>{item.estimated_timestamp_seconds !== null ? formatTime(item.estimated_timestamp_seconds) : 'No estimate'}</span>
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
            { title: 'Close with a review handoff', description: 'Finish the timer, review the summary, and tell upload/review staff about any unusual conditions.' },
          ]} />

          <QAReviewChecklist items={[
            { title: 'Timer discipline', description: 'Start at actual capture start and use pause/resume only for genuine interruptions.' },
            { title: 'Note quality', description: 'Notes should explain anomalies, not repeat obvious labels such as “intersection” without extra context.' },
            { title: 'Review handoff', description: 'After finishing, remind reviewers about missing coverage, retakes, or route deviations before media ingestion.' },
          ]} />

          <VisibilityRulesPanel title="Internal-only Data Reminder" rules={[
            { title: 'Field notes stay internal', description: 'Notes on this page may contain operational shorthand, quality concerns, or safety comments and should not be surfaced directly to clients.' },
            { title: 'Review summaries are curated', description: 'If the client needs context later, staff should rewrite that context into client-facing summaries after internal QA.' },
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
                        <Badge variant="outline">{formatTime(event.timestamp_offset_seconds || 0)}</Badge>
                      </div>
                      {event.event_note && <p className="text-muted-foreground mt-1 leading-6">{event.event_note}</p>}
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
