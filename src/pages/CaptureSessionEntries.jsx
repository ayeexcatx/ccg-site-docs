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
import { formatLabel } from '@/lib/displayUtils';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, ListOrdered, Plus, Search, Sparkles } from 'lucide-react';

const sessionTemplates = [
  { key: 'include_right_profile', label: 'Right Profile', viewType: 'right_profile', captureMethod: 'video', category: 'standard' },
  { key: 'include_left_profile', label: 'Left Profile', viewType: 'left_profile', captureMethod: 'video', category: 'standard' },
  { key: 'include_curb_line', label: 'Curb Line / Edge of Pavement', viewType: 'curb_line_edge_of_pavement', captureMethod: 'video', category: 'standard' },
  { key: 'include_cross_section', label: 'Cross Section', viewType: 'cross_section', captureMethod: 'video', category: 'standard' },
  { key: 'include_360_walk', label: '360 Walk', viewType: '360_walk', captureMethod: 'video_360', category: 'optional' },
];

const emptyEntry = {
  project_id: '',
  entry_type: 'roadway',
  entry_name: '',
  street_name: '',
  from_location: '',
  to_location: '',
  address_range_start: '',
  address_range_end: '',
  municipality: '',
  frontage_side: 'both',
  notes: '',
  include_right_profile: true,
  include_left_profile: true,
  include_curb_line: true,
  include_cross_section: true,
  include_360_walk: false,
  recording_order: 1,
  active: true,
  generated_session_count: 0,
  generation_status: 'not_started',
};

function buildSessionPayload(entry, projectName, template, sequence) {
  const descriptionParts = [
    entry.street_name,
    entry.from_location && entry.to_location ? `${entry.from_location} to ${entry.to_location}` : '',
    entry.address_range_start || entry.address_range_end ? `${entry.address_range_start || '?'}-${entry.address_range_end || '?'}` : '',
    entry.frontage_side && entry.frontage_side !== 'both' ? `${formatLabel(entry.frontage_side)} frontage` : '',
  ].filter(Boolean);

  return {
    project_id: entry.project_id,
    capture_session_entry_id: entry.id,
    session_name: `${entry.entry_name} — ${template.label}`,
    session_code: `${(projectName || 'PRJ').slice(0, 4).toUpperCase()}-${String(entry.recording_order || 0).padStart(2, '0')}-${sequence + 1}`,
    session_status: 'planned',
    capture_method: template.captureMethod,
    default_view_type: template.viewType,
    recording_order: Number(entry.recording_order || 0) * 10 + sequence,
    session_area_description: descriptionParts.join(' · ') || entry.notes || entry.entry_name,
    weather_notes: '',
    field_notes_internal: `Generated from entry: ${entry.entry_name}`,
    field_notes_client_visible: '',
    gps_track_expected: true,
    gps_sync_status: 'not_started',
    timeline_index_status: 'not_started',
    qa_status: 'not_reviewed',
    video_upload_status: 'not_uploaded',
    session_handoff_status: 'not_started',
  };
}

export default function CaptureSessionEntries() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyEntry);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['capture-session-entries'],
    queryFn: () => base44.entities.CaptureSessionEntry.list('-recording_order', 200),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['capture-sessions'],
    queryFn: () => base44.entities.CaptureSession.list('recording_order', 300),
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

  const createSessionMut = useMutation({
    mutationFn: async (entry) => {
      const projectName = projects.find((project) => project.id === entry.project_id)?.project_name;
      const selectedTemplates = sessionTemplates.filter((template) => entry[template.key]);
      const existingSessions = sessions.filter((session) => session.capture_session_entry_id === entry.id);
      const existingViews = new Set(existingSessions.map((session) => session.default_view_type));
      const pendingTemplates = selectedTemplates.filter((template) => !existingViews.has(template.viewType));

      for (const [index, template] of pendingTemplates.entries()) {
        await base44.entities.CaptureSession.create(buildSessionPayload(entry, projectName, template, index));
      }

      await base44.entities.CaptureSessionEntry.update(entry.id, {
        generated_session_count: existingSessions.length + pendingTemplates.length,
        generation_status: pendingTemplates.length === 0 && existingSessions.length > 0 ? 'generated' : pendingTemplates.length === selectedTemplates.length ? 'generated' : 'partially_generated',
      });

      return pendingTemplates.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capture-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['capture-session-entries'] });
    },
  });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project]));
  const sessionsByEntry = sessions.reduce((accumulator, session) => {
    if (!session.capture_session_entry_id) return accumulator;
    accumulator[session.capture_session_entry_id] = accumulator[session.capture_session_entry_id] || [];
    accumulator[session.capture_session_entry_id].push(session);
    return accumulator;
  }, {});

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const matchesProject = projectFilter === 'all' || entry.project_id === projectFilter;
    const haystack = [
      entry.entry_name,
      entry.street_name,
      entry.from_location,
      entry.to_location,
      entry.notes,
      entry.municipality,
      projectMap[entry.project_id]?.project_name,
    ].filter(Boolean).join(' ').toLowerCase();
    return matchesProject && haystack.includes(search.toLowerCase());
  }), [entries, projectFilter, search, projectMap]);

  const generatedSessionCount = sessions.filter((session) => session.capture_session_entry_id).length;
  const activeEntryCount = entries.filter((entry) => entry.active !== false).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capture Session Entries"
        description="Describe the road, range, or frontage once, then auto-generate the session stack crews will actually record."
        helpText="Example entries: Main Street from Oak Ave to Elm Ave, Robert Street from Main St to Park Ave, or Curb Ramp Range A–F."
      >
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.capture_session_entries.title, sections: PAGE_GUIDANCE.capture_session_entries.sections }} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Entries ready</p><p className="mt-2 text-2xl font-semibold">{activeEntryCount}</p><p className="mt-2 text-sm text-muted-foreground">Roadway and range definitions that can spin up generated sessions.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Generated sessions</p><p className="mt-2 text-2xl font-semibold">{generatedSessionCount}</p><p className="mt-2 text-sm text-muted-foreground">Sessions already created from entry templates.</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">360 enabled</p><p className="mt-2 text-2xl font-semibold">{entries.filter((entry) => entry.include_360_walk).length}</p><p className="mt-2 text-sm text-muted-foreground">Entries that will add the optional 360 walk session.</p></CardContent></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search entry name, street, municipality, or notes" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredEntries.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No session entries yet" description="Add a roadway, range, or frontage definition so the portal can generate Right Profile, Left Profile, curb line, cross section, and optional 360 sessions for you." />
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry) => {
            const generatedSessions = sessionsByEntry[entry.id] || [];
            const enabledViews = sessionTemplates.filter((template) => entry[template.key]);
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{entry.entry_name || 'Untitled entry'}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {projectMap[entry.project_id]?.project_name || 'No project'} · {formatLabel(entry.entry_type)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={entry.active === false ? 'inactive' : 'active'} />
                      <StatusBadge status={entry.generation_status || 'not_started'} />
                      <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">Order {entry.recording_order || 0}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-lg border p-3 space-y-2">
                      <p><span className="font-medium text-foreground">Road / range:</span> {entry.street_name || 'Custom area'}{entry.from_location || entry.to_location ? ` · ${entry.from_location || '?'} to ${entry.to_location || '?'}` : ''}</p>
                      {(entry.address_range_start || entry.address_range_end) && <p><span className="font-medium text-foreground">Address range:</span> {entry.address_range_start || '?'} to {entry.address_range_end || '?'}</p>}
                      <p><span className="font-medium text-foreground">Frontage:</span> {formatLabel(entry.frontage_side || 'both')}</p>
                      <p><span className="font-medium text-foreground">Field note:</span> {entry.notes || 'No extra setup notes.'}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="font-medium text-foreground">Generated session recipe</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {enabledViews.map((template) => <Badge key={template.key} variant="outline">{template.label}</Badge>)}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Current generated count: {generatedSessions.length}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-primary" />
                      <p className="font-medium text-foreground">Session order preview</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {enabledViews.map((template, index) => (
                        <span key={template.key} className="rounded-full border px-2 py-1 text-xs">
                          {Number(entry.recording_order || 0) * 10 + index} · {template.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {generatedSessions.length > 0 && (
                    <div className="rounded-lg border p-3">
                      <p className="mb-2 font-medium text-foreground">Current generated sessions</p>
                      <div className="flex flex-wrap gap-2">
                        {generatedSessions.map((session) => <span key={session.id} className="rounded-full border px-2 py-1 text-xs">{session.recording_order || 0} · {session.session_name}</span>)}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button className="gap-2" onClick={() => createSessionMut.mutate(entry)} disabled={createSessionMut.isPending || enabledViews.length === 0}>
                      <Sparkles className="h-4 w-4" /> Generate Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyEntry); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New capture session entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Project *</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Entry type</Label><Select value={form.entry_type} onValueChange={(value) => setForm((current) => ({ ...current, entry_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['roadway', 'range', 'frontage', 'intersection', 'custom'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Entry name *</Label><Input value={form.entry_name} onChange={(event) => setForm((current) => ({ ...current, entry_name: event.target.value }))} placeholder="Main Street from Oak Ave to Elm Ave" /></div>
              <div><Label>Road / corridor / range</Label><Input value={form.street_name} onChange={(event) => setForm((current) => ({ ...current, street_name: event.target.value }))} placeholder="Main Street" /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>From</Label><Input value={form.from_location} onChange={(event) => setForm((current) => ({ ...current, from_location: event.target.value }))} placeholder="Oak Ave" /></div>
              <div><Label>To</Label><Input value={form.to_location} onChange={(event) => setForm((current) => ({ ...current, to_location: event.target.value }))} placeholder="Elm Ave" /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Address range start</Label><Input value={form.address_range_start} onChange={(event) => setForm((current) => ({ ...current, address_range_start: event.target.value }))} placeholder="100" /></div>
              <div><Label>Address range end</Label><Input value={form.address_range_end} onChange={(event) => setForm((current) => ({ ...current, address_range_end: event.target.value }))} placeholder="198" /></div>
              <div><Label>Frontage details</Label><Select value={form.frontage_side} onValueChange={(value) => setForm((current) => ({ ...current, frontage_side: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['both', 'north', 'south', 'east', 'west', 'inside', 'outside'].map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Municipality</Label><Input value={form.municipality} onChange={(event) => setForm((current) => ({ ...current, municipality: event.target.value }))} /></div>
              <div><Label>Recording order</Label><Input type="number" value={form.recording_order} onChange={(event) => setForm((current) => ({ ...current, recording_order: Number(event.target.value || 0) }))} /></div>
            </div>
            <div><Label>Field note / setup note</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Example: Stay on the east curb line first, then return for cross sections at signalized intersections." /></div>
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Standard recording views</p>
                <p className="text-xs text-muted-foreground">The standard stack is Right Profile, Left Profile, Curb Line / Edge of Pavement, and Cross Section. Turn on 360 only if this entry needs it.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {sessionTemplates.map((template) => (
                  <label key={template.key} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={Boolean(form[template.key])} onChange={(event) => setForm((current) => ({ ...current, [template.key]: event.target.checked }))} />
                    <div>
                      <p className="font-medium text-foreground">{template.label}</p>
                      <p className="text-xs text-muted-foreground">{template.category === 'optional' ? 'Optional 360 run for this entry.' : 'Auto-generated recording session.'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyEntry); }}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.project_id || !form.entry_name}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
