import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DocumentationPageIntro, NextStepPanel } from '@/components/ui/OperatingGuidance';
import { Plus, MapPin, Search, Pencil, WandSparkles } from 'lucide-react';
import { SEGMENT_TYPE_LABELS } from '@/lib/constants';
import { buildDefaultCaptureSessions } from '@/lib/sessionWorkflow';
import { PAGE_GUIDANCE, REFERENCE_CODE_HELPER } from '@/lib/workflowGuidance';

const emptySegment = {
  project_id: '', segment_type: 'street', street_name: '', segment_name: '', segment_code: '',
  side_of_street: 'both', address_range_start: '', address_range_end: '',
  from_intersection: '', to_intersection: '', municipality: '', sequence_order: 0,
  expected_views_json: '', route_length_notes: '', internal_notes: '', client_visible_notes: '',
  enable_360_walk: false,
};

export default function StreetSegments() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySegment);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: segments = [], isLoading } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => base44.entities.CaptureSession.list('sequence_order', 400) });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const segment = await base44.entities.StreetSegment.create(data);
      const defaults = buildDefaultCaptureSessions({ segment, include360Walk: !!data.enable_360_walk });
      await Promise.all(defaults.map((session) => base44.entities.CaptureSession.create(session)));
      return segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      closeForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StreetSegment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['segments'] }); closeForm(); },
  });

  const generateSessionsMut = useMutation({
    mutationFn: async (segment) => {
      const existingSessions = sessions.filter((session) => session.street_segment_id === segment.id);
      const defaults = buildDefaultCaptureSessions({ segment, include360Walk: !!segment.enable_360_walk, existingSessions });
      await Promise.all(defaults.map((session) => base44.entities.CaptureSession.create(session)));
      return defaults.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySegment); };
  const openEdit = (segment) => { setEditing(segment); setForm({ ...emptySegment, ...segment }); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const sessionsBySegment = useMemo(() => sessions.reduce((acc, session) => {
    acc[session.street_segment_id] = (acc[session.street_segment_id] || 0) + 1;
    return acc;
  }, {}), [sessions]);

  const filtered = segments.filter((segment) => {
    const matchSearch = segment.street_name?.toLowerCase().includes(search.toLowerCase()) || segment.segment_code?.toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'all' || segment.project_id === projectFilter;
    return matchSearch && matchProject;
  });

  const guidance = PAGE_GUIDANCE.street_segments.sections;

  return (
    <div className="space-y-6">
      <PageHeader title="Street Segments" description="Define streets, blocks, curb ramp groups, and route segments for each project." helpText="Create the segment once, then generate the default capture sessions instead of building every session by hand.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptySegment); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Segment</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.street_segments.title, sections: guidance }} />
      <NextStepPanel step={guidance.nextStep} detail="As soon as a segment is saved, review the generated sessions and adjust anything unusual before you start route planning." />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No segments found" description="Add street segments to organize documentation by street, block, or area." />
      ) : (
        <div className="grid gap-3">
          {filtered.map(segment => (
            <Card key={segment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{segment.street_name} {segment.segment_name ? `— ${segment.segment_name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{segment.segment_code || 'No segment code'} · {projectMap[segment.project_id] || 'No project'} · {segment.from_intersection || '?'} to {segment.to_intersection || '?'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sessionsBySegment[segment.id] || 0} capture sessions linked · {segment.enable_360_walk ? '360 Walk enabled' : '360 Walk disabled'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant="outline" className="text-xs">{SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}</Badge>
                  <Badge variant="outline" className="text-xs">{segment.side_of_street?.replace(/_/g, ' ')}</Badge>
                  <Button variant="outline" size="sm" onClick={() => generateSessionsMut.mutate(segment)} className="gap-2"><WandSparkles className="w-4 h-4" /> Generate Default Sessions</Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(segment)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Segment' : 'New Street Segment'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Project *</Label>
              <Select value={form.project_id || 'none'} onValueChange={value => setForm({ ...form, project_id: value === 'none' ? '' : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select project...</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Street Name *</Label><Input value={form.street_name} onChange={e => setForm({ ...form, street_name: e.target.value })} /></div>
              <div>
                <Label>Segment Code</Label>
                <Input value={form.segment_code} onChange={e => setForm({ ...form, segment_code: e.target.value })} placeholder="e.g. ELM-001" />
                <p className="mt-1 text-xs text-muted-foreground">{REFERENCE_CODE_HELPER}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Segment Type</Label><Select value={form.segment_type} onValueChange={value => setForm({ ...form, segment_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SEGMENT_TYPE_LABELS).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Side of Street</Label><Select value={form.side_of_street} onValueChange={value => setForm({ ...form, side_of_street: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['right', 'left', 'center', 'both', 'not_applicable'].map(side => <SelectItem key={side} value={side}>{side.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Intersection</Label><Input value={form.from_intersection} onChange={e => setForm({ ...form, from_intersection: e.target.value })} /></div>
              <div><Label>To Intersection</Label><Input value={form.to_intersection} onChange={e => setForm({ ...form, to_intersection: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sequence Order</Label><Input type="number" value={form.sequence_order} onChange={e => setForm({ ...form, sequence_order: parseInt(e.target.value, 10) || 0 })} /></div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-sm font-medium">Optional 360 Walk session</p>
                <p className="text-xs text-muted-foreground">Turn this on if this segment also needs a 360 walk capture session.</p>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.enable_360_walk} onChange={e => setForm({ ...form, enable_360_walk: e.target.checked })} /> Enable 360 Walk</label>
              </div>
            </div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.street_name || !form.project_id}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
