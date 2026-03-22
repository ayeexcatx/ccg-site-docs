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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { ClipboardList, Plus, Search } from 'lucide-react';

const emptyEntry = {
  capture_session_id: '',
  project_id: '',
  entry_type: 'note',
  title: '',
  entry_text: '',
  captured_at: '',
  timeline_label: '',
  gps_source: 'manual',
  latitude: '',
  longitude: '',
};

export default function CaptureSessionEntries() {
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyEntry);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['capture-session-entries'],
    queryFn: () => base44.entities.CaptureSessionEntry.list('-created_date', 200),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['capture-sessions'],
    queryFn: () => base44.entities.CaptureSession.list('-created_date', 200),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.CaptureSessionEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capture-session-entries'] });
      setShowForm(false);
      setForm(emptyEntry);
    },
  });

  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project]));

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const matchesSession = sessionFilter === 'all' || entry.capture_session_id === sessionFilter;
    const haystack = [entry.title, entry.entry_text, entry.timeline_label, sessionMap[entry.capture_session_id]?.session_name, projectMap[entry.project_id]?.project_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    return matchesSession && matchesSearch;
  }), [entries, sessionFilter, search, sessionMap, projectMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capture Session Entries"
        description="Create and review the atomic notes, events, and timeline records that describe what happened during a capture session."
        helpText="Entries become the searchable timeline layer used by internal QA and the client portal."
      >
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.capture_session_entries.title, sections: PAGE_GUIDANCE.capture_session_entries.sections }} />

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, note, session, project, or timeline label" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            {sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredEntries.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No capture session entries yet" description="Start adding field notes, pairing checkpoints, and timeline-ready observations for each capture session." />
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{entry.title || 'Untitled entry'}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {projectMap[entry.project_id]?.project_name || 'No project'} · {sessionMap[entry.capture_session_id]?.session_name || 'No session'}
                    </p>
                  </div>
                  <StatusBadge status={entry.entry_type || 'note'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{entry.entry_text || 'No entry text provided.'}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {entry.timeline_label && <span className="rounded-full border px-2 py-1">Timeline: {entry.timeline_label}</span>}
                  {entry.captured_at && <span className="rounded-full border px-2 py-1">Captured: {entry.captured_at}</span>}
                  {entry.gps_source && <span className="rounded-full border px-2 py-1">GPS source: {entry.gps_source}</span>}
                  {(entry.latitude || entry.longitude) && <span className="rounded-full border px-2 py-1">{entry.latitude || '?'} , {entry.longitude || '?'}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyEntry); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New capture session entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Session *</Label><Select value={form.capture_session_id || 'none'} onValueChange={(value) => {
                const session = sessions.find((item) => item.id === value);
                setForm((current) => ({ ...current, capture_session_id: value === 'none' ? '' : value, project_id: session?.project_id || '' }));
              }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select session</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Entry type</Label><Select value={form.entry_type} onValueChange={(value) => setForm((current) => ({ ...current, entry_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['note', 'observation', 'gps_pairing', 'issue', 'milestone'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
              <div><Label>Captured at</Label><Input type="datetime-local" value={form.captured_at} onChange={(event) => setForm((current) => ({ ...current, captured_at: event.target.value }))} /></div>
            </div>
            <div><Label>Entry text</Label><Textarea value={form.entry_text} onChange={(event) => setForm((current) => ({ ...current, entry_text: event.target.value }))} /></div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Timeline label</Label><Input value={form.timeline_label} onChange={(event) => setForm((current) => ({ ...current, timeline_label: event.target.value }))} placeholder="e.g. Approaching Elm/Pine" /></div>
              <div><Label>GPS source</Label><Select value={form.gps_source} onValueChange={(value) => setForm((current) => ({ ...current, gps_source: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['manual', 'gpx', 'fit', 'device_live', 'derived'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Project</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Latitude</Label><Input value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} /></div>
              <div><Label>Longitude</Label><Input value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyEntry); }}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.capture_session_id || !form.title}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
