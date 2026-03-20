import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, Square, Crosshair, Landmark, CornerDownRight, StickyNote, Clock } from 'lucide-react';

export default function FieldSession() {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [note, setNote] = useState('');
  const [events, setEvents] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.CaptureSession.filter({ session_status: 'ready' }),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-sessions-field'],
    queryFn: () => base44.entities.CaptureSession.list('-created_date', 50),
  });

  const availableSessions = [...sessions, ...allSessions.filter(s => s.session_status === 'in_progress')];
  const uniqueSessions = Array.from(new Map(availableSessions.map(s => [s.id, s])).values());

  const createEventMut = useMutation({
    mutationFn: (d) => base44.entities.FieldSessionEvent.create(d),
    onSuccess: (data) => {
      setEvents(prev => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['field-events'] });
    },
  });

  const updateSessionMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data),
  });

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, startTime]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const logEvent = (eventType, label) => {
    if (!selectedSessionId) return;
    const session = uniqueSessions.find(s => s.id === selectedSessionId);
    createEventMut.mutate({
      capture_session_id: selectedSessionId,
      project_id: session?.project_id || '',
      event_type: eventType,
      event_label: label || eventType.replace(/_/g, ' '),
      event_note: note || '',
      timestamp_offset_seconds: elapsed,
    });
    setNote('');
  };

  const handleStart = () => {
    if (!selectedSessionId) return;
    setIsRunning(true);
    setIsPaused(false);
    setStartTime(Date.now());
    setEvents([]);
    setElapsed(0);
    logEvent('session_start', 'Session Started');
    updateSessionMut.mutate({ id: selectedSessionId, data: { session_status: 'in_progress', actual_start_time: new Date().toISOString() } });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    logEvent(isPaused ? 'session_resume' : 'session_pause', isPaused ? 'Resumed' : 'Paused');
  };

  const handleFinish = () => {
    logEvent('session_end', 'Session Ended');
    setIsRunning(false);
    setIsPaused(false);
    updateSessionMut.mutate({ id: selectedSessionId, data: { session_status: 'uploaded', actual_end_time: new Date().toISOString() } });
  };

  const eventButtons = [
    { type: 'intersection', label: 'Intersection', icon: Crosshair, color: 'bg-blue-600 hover:bg-blue-700' },
    { type: 'landmark', label: 'Landmark', icon: Landmark, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { type: 'curb_ramp', label: 'Curb Ramp', icon: CornerDownRight, color: 'bg-amber-600 hover:bg-amber-700' },
    { type: 'issue_note', label: 'Issue Note', icon: StickyNote, color: 'bg-red-600 hover:bg-red-700' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Field Session" description="Lightweight mobile-friendly page for documenters to log events during a capture session." />

      <HowThisWorks items={[
        "Select a session that is marked 'ready' or 'in progress' to begin.",
        "Tap Start Session to begin timing. Tap event buttons as you walk to log intersections, landmarks, and curb ramps.",
        "Each tap records the event type and timestamp offset. You can optionally add a note.",
        "When finished, tap Finish to end the session. Events will be available for marker review."
      ]} />

      {!isRunning ? (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Select Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSessionId || 'none'} onValueChange={v => setSelectedSessionId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Choose a session..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select session...</SelectItem>
                {uniqueSessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_name} ({s.session_status})</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full h-14 text-lg gap-3" onClick={handleStart} disabled={!selectedSessionId}>
              <Play className="w-6 h-6" /> Start Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold font-mono tracking-wider">{formatTime(elapsed)}</span>
              </div>
              <Badge variant={isPaused ? 'destructive' : 'default'}>{isPaused ? 'Paused' : 'Recording'}</Badge>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {eventButtons.map(btn => (
              <Button
                key={btn.type}
                onClick={() => logEvent(btn.type, btn.label)}
                className={`h-20 text-base font-semibold text-white ${btn.color} flex flex-col items-center justify-center gap-1`}
                disabled={isPaused}
              >
                <btn.icon className="w-6 h-6" />
                {btn.label}
              </Button>
            ))}
          </div>

          <div className="mb-4">
            <Textarea placeholder="Optional note for the next event..." value={note} onChange={e => setNote(e.target.value)} className="h-16" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button variant="outline" className="h-12" onClick={handlePause}>
              <Pause className="w-5 h-5 mr-2" /> {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="destructive" className="h-12" onClick={handleFinish}>
              <Square className="w-5 h-5 mr-2" /> Finish
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Event Log ({events.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-60 overflow-y-auto">
              {events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{ev.event_type?.replace(/_/g, ' ')}</Badge>
                    <span className="text-muted-foreground">{ev.event_label || ''}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{formatTime(ev.timestamp_offset_seconds || 0)}</span>
                </div>
              ))}
              {events.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No events logged yet. Tap buttons above to log.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}