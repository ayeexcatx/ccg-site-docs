import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { formatLabel, formatTimestamp } from '@/lib/displayUtils';
import { Play, Pause, Square, Shield, Clock3, MapPinned, StickyNote, Upload } from 'lucide-react';

export default function FieldSession() {
  const [activeSessionId, setActiveSessionId] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [eventType, setEventType] = useState('observation');
  const [eventNote, setEventNote] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('recording_order', 200) });
  const { data: events = [] } = useQuery({ queryKey: ['field-session-events'], queryFn: () => base44.entities.FieldSessionEvent.list('-created_date', 300) });
  const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const scopedEvents = useMemo(() => events.filter((event) => event.capture_session_id === activeSession?.id), [events, activeSession]);

  useEffect(() => {
    setElapsedSeconds(0);
    if (!activeSession?.actual_start_time) return;
    const start = new Date(activeSession.actual_start_time).getTime();
    const end = activeSession.actual_end_time ? new Date(activeSession.actual_end_time).getTime() : Date.now();
    setElapsedSeconds(Math.max(0, Math.floor((end - start) / 1000)));
    if (activeSession.session_status !== 'in_progress') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const eventMut = useMutation({ mutationFn: (data) => base44.entities.FieldSessionEvent.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-session-events'] }) });
  const sessionMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capture-sessions'] }) });

  const logLifecycle = (status, type, defaultLabel, extraData = {}) => {
    if (!activeSession?.id) return;
    const nowIso = new Date().toISOString();
    const payload = { session_status: status, ...extraData };
    if (type === 'session_start') payload.actual_start_time = nowIso;
    if (type === 'session_end') payload.actual_end_time = nowIso;
    sessionMut.mutate({ id: activeSession.id, data: payload });
    eventMut.mutate({
      capture_session_id: activeSession.id,
      project_id: activeSession.project_id,
      event_type: type,
      event_label: defaultLabel,
      event_note: extraData.event_note || '',
      event_time: nowIso,
      timestamp_offset_seconds: elapsedSeconds,
      handoff_ready: extraData.handoff_ready || false,
    });
  };

  const logEvent = () => {
    if (!activeSession?.id || !eventLabel.trim()) return;
    eventMut.mutate({
      capture_session_id: activeSession.id,
      project_id: activeSession.project_id,
      event_type: eventType,
      event_label: eventLabel,
      event_note: eventNote,
      event_time: new Date().toISOString(),
      timestamp_offset_seconds: elapsedSeconds,
    });
    setEventLabel('');
    setEventNote('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Field Session" description="Run the generated session with simple start/stop controls, a live timer, GPS/track guidance, optional notes, and a clean handoff to upload + pairing." />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.field_session.title, sections: PAGE_GUIDANCE.field_session.sections }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Active session</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label>Choose generated session</Label>
            <Select value={activeSession?.id || 'none'} onValueChange={(value) => setActiveSessionId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select session</SelectItem>
                {sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.recording_order || 0}. {session.session_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeSession && <div className="flex flex-wrap gap-2"><StatusBadge status={activeSession.session_status} /><StatusBadge status={activeSession.gps_sync_status || 'not_started'} /><StatusBadge status={activeSession.session_handoff_status || 'not_started'} /></div>}
        </CardContent>
      </Card>

      {!activeSession ? <EmptyState icon={Shield} title="No session selected" description="Choose the session you are actively recording before starting the timer or adding event notes." /> : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Session controls</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button className="gap-2" onClick={() => logLifecycle('in_progress', 'session_start', 'Session started', { session_handoff_status: 'not_started' })}><Play className="h-4 w-4" /> Start</Button>
                  <Button variant="secondary" className="gap-2" onClick={() => logLifecycle('paused', 'session_pause', 'Session paused')}><Pause className="h-4 w-4" /> Pause</Button>
                  <Button variant="outline" className="gap-2" onClick={() => logLifecycle('uploaded', 'session_end', 'Session completed and handed off', { gps_sync_status: 'pending', timeline_index_status: 'not_started', session_handoff_status: 'ready_for_upload', handoff_ready: true })}><Square className="h-4 w-4" /> Complete & handoff</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Timer</p><p className="mt-2 text-2xl font-semibold">{formatTimestamp(elapsedSeconds, '00:00')}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">View</p><p className="mt-2 font-medium text-foreground">{formatLabel(activeSession.default_view_type)}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">GPS / track workflow</p><p className="mt-2 font-medium text-foreground">{activeSession.gps_track_expected ? 'Start camera and GPX/FIT together' : 'Optional track'}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Completion / handoff</p><p className="mt-2 font-medium text-foreground">{formatLabel(activeSession.session_handoff_status || 'not_started')}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">GPS / track workflow guidance</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border p-3"><p className="font-medium text-foreground">1. Start both sources together.</p><p>Example: press record on the profile camera, start the watch or phone track, then tap Start here right away.</p></div>
                <div className="rounded-lg border p-3"><p className="font-medium text-foreground">2. Keep notes light.</p><p>Add notes only for pauses, traffic interruptions, missed coverage, or anything that will matter during GPX/FIT pairing and timeline review.</p></div>
                <div className="rounded-lg border p-3"><p className="font-medium text-foreground">3. Handoff when the run ends.</p><p>Complete & handoff means the next stop is Media Library for video upload, GPX/FIT upload, pairing, sync review, and indexing.</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Optional event note</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <div><Label>Event type</Label><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['observation', 'issue_note', 'milestone', 'cut_suggested', 'custom'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Short label</Label><Input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="Example: Signal cycle delay at Elm" /></div>
                </div>
                <div><Label>Note</Label><Textarea value={eventNote} onChange={(event) => setEventNote(event.target.value)} placeholder="Only add detail if it helps syncing, indexing, or a later reviewer." /></div>
                <Button onClick={logEvent} className="w-full gap-2"><StickyNote className="h-4 w-4" /> Save Event Note</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Session snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border p-3"><p className="font-medium text-foreground">{activeSession.session_name}</p><p className="mt-1">{activeSession.session_area_description || 'No area description yet.'}</p></div>
                <div className="rounded-lg border p-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><span>Started: {activeSession.actual_start_time ? new Date(activeSession.actual_start_time).toLocaleString() : 'Not started yet'}</span></div>
                <div className="rounded-lg border p-3 flex items-center gap-2"><MapPinned className="h-4 w-4 text-primary" /><span>GPS sync status: {formatLabel(activeSession.gps_sync_status || 'not_started')}</span></div>
                <div className="rounded-lg border p-3 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /><span>Handoff target: upload video and GPX/FIT to this session next.</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent event history</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {scopedEvents.length === 0 ? <p className="text-sm text-muted-foreground">No events logged for this session yet.</p> : scopedEvents.map((event) => <div key={event.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{event.event_label || 'Untitled event'}</p><StatusBadge status={event.event_type} /></div><p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(event.timestamp_offset_seconds || 0)} from session start</p>{event.event_note && <p className="mt-2 text-sm text-muted-foreground">{event.event_note}</p>}</div>)}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
