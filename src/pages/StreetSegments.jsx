import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Search, Pencil } from 'lucide-react';
import { SEGMENT_TYPE_LABELS } from '@/lib/constants';

const emptySegment = {
  project_id: '', segment_type: 'street', street_name: '', segment_name: '', segment_code: '',
  side_of_street: 'both', address_range_start: '', address_range_end: '',
  from_intersection: '', to_intersection: '', municipality: '', sequence_order: 0,
  expected_views_json: '', route_length_notes: '', internal_notes: '', client_visible_notes: ''
};

export default function StreetSegments() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySegment);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.StreetSegment.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['segments'] }); closeForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StreetSegment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['segments'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySegment); };
  const openEdit = (s) => { setEditing(s); setForm(s); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });

  const filtered = segments.filter(s => {
    const matchSearch = s.street_name?.toLowerCase().includes(search.toLowerCase()) || s.segment_code?.toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'all' || s.project_id === projectFilter;
    return matchSearch && matchProject;
  });

  return (
    <div>
      <PageHeader title="Street Segments" description="Define streets, blocks, curb ramp groups, and route segments for each project."
        helpText="Segments break a project area into individual documentation units. Each segment can have its own capture sessions and media.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptySegment); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Segment</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Each segment represents a street, block, or curb ramp group within a project.",
        "Define expected views (profile, curb line, cross section) so documenters know what to capture.",
        "Sequence order controls how segments appear in lists and client-facing views.",
        "Intersections (from/to) help users understand the geographic boundaries of each segment."
      ]} />

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
          {filtered.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.street_name} {s.segment_name ? `— ${s.segment_name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.segment_code} · {projectMap[s.project_id] || 'No project'} · {s.from_intersection || '?'} to {s.to_intersection || '?'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{SEGMENT_TYPE_LABELS[s.segment_type] || s.segment_type}</Badge>
                  <Badge variant="outline" className="text-xs">{s.side_of_street?.replace(/_/g, ' ')}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Segment' : 'New Street Segment'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Project *</Label>
              <Select value={form.project_id || 'none'} onValueChange={v => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select project...</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Street Name *</Label><Input value={form.street_name} onChange={e => setForm({ ...form, street_name: e.target.value })} /></div>
              <div><Label>Segment Code</Label><Input value={form.segment_code} onChange={e => setForm({ ...form, segment_code: e.target.value })} placeholder="e.g. ELM-001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Segment Type</Label>
                <Select value={form.segment_type} onValueChange={v => setForm({ ...form, segment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEGMENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Side of Street</Label>
                <Select value={form.side_of_street} onValueChange={v => setForm({ ...form, side_of_street: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['right', 'left', 'center', 'both', 'not_applicable'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Intersection</Label><Input value={form.from_intersection} onChange={e => setForm({ ...form, from_intersection: e.target.value })} /></div>
              <div><Label>To Intersection</Label><Input value={form.to_intersection} onChange={e => setForm({ ...form, to_intersection: e.target.value })} /></div>
            </div>
            <div><Label>Sequence Order</Label><Input type="number" value={form.sequence_order} onChange={e => setForm({ ...form, sequence_order: parseInt(e.target.value) || 0 })} /></div>
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