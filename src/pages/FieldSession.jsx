import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Play, Pause, Square, Shield } from 'lucide-react';

export default function FieldSession() {
  const [activeSessionId, setActiveSessionId] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [eventType, setEventType] = useState('observation');
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: events = [] } = useQuery({ queryKey: ['field-session-events'], queryFn: () => base44.entities.FieldSessionEvent.list('-created_date', 300) });
  const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const scopedEvents = events.filter((event) => event.capture_session_id === activeSession?.id);

  const eventMut = useMutation({ mutationFn: (data) => base44.entities.FieldSessionEvent.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-session-events'] }) });
  const sessionMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capture-sessions'] }) });

  const logLifecycle = (status, type, defaultLabel) => {
    if (!activeSession?.id) return;
    sessionMut.mutate({ id: activeSession.id, data: { session_status: status } });
    eventMut.mutate({ capture_session_id: activeSession.id, project_id: activeSession.project_id, event_type: type, event_label: defaultLabel, timestamp_offset_seconds: 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Field Session" description="Run the live field workflow for a capture session and log timing-aware events as work happens." />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.field_session.title, sections: PAGE_GUIDANCE.field_session.sections }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Active session</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label>Choose session</Label>
            <Select value={activeSession?.id || 'none'} onValueChange={(value) => setActiveSessionId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select session</SelectItem>
                {sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeSession && <div className="flex flex-wrap gap-2"><StatusBadge status={activeSession.session_status} /><StatusBadge status={activeSession.qa_status} /></div>}
        </CardContent>
      </Card>

      {!activeSession ? <EmptyState icon={Shield} title="No session selected" description="Choose the session you are actively capturing before logging field activity." /> : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Session controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Button className="gap-2" onClick={() => logLifecycle('in_progress', 'session_start', 'Session started')}><Play className="h-4 w-4" /> Start</Button>
                <Button variant="secondary" className="gap-2" onClick={() => logLifecycle('paused', 'session_pause', 'Session paused')}><Pause className="h-4 w-4" /> Pause</Button>
                <Button variant="outline" className="gap-2" onClick={() => logLifecycle('uploaded', 'session_end', 'Session ended')}><Square className="h-4 w-4" /> End</Button>
              </div>
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Session:</span> {activeSession.session_name}</p>
                <p><span className="font-medium text-foreground">Method:</span> {activeSession.capture_method}</p>
                <p><span className="font-medium text-foreground">View:</span> {activeSession.view_type}</p>
                <p><span className="font-medium text-foreground">Direction:</span> {activeSession.walking_direction_description || 'Not set'}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                <div><Label>Event type</Label><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['observation', 'issue_note', 'gps_pairing', 'milestone', 'custom'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Event label</Label><Input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="Short field note" /></div>
                <Button onClick={() => { if (!eventLabel.trim()) return; eventMut.mutate({ capture_session_id: activeSession.id, project_id: activeSession.project_id, event_type: eventType, event_label: eventLabel, timestamp_offset_seconds: 0 }); setEventLabel(''); }}>Log Event</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Event history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {scopedEvents.length === 0 ? <p className="text-sm text-muted-foreground">No events logged for this session yet.</p> : scopedEvents.map((event) => <div key={event.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{event.event_label || 'Untitled event'}</p><StatusBadge status={event.event_type} /></div><p className="mt-1 text-xs text-muted-foreground">Offset seconds: {event.timestamp_offset_seconds || 0}</p></div>)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
