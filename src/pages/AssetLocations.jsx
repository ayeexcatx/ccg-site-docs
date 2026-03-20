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
import { Plus, MapPinned, Search, Pencil } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/constants';

const emptyAsset = {
  project_id: '', street_segment_id: '', asset_type: 'intersection', asset_name: '',
  street_address: '', cross_street: '', business_name: '', reference_description: '',
  internal_notes: '', client_visible_notes: ''
};

export default function AssetLocations() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAsset);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.AssetLocation.list('-created_date', 200),
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.AssetLocation.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssetLocation.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyAsset); };
  const openEdit = (a) => { setEditing(a); setForm(a); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });

  const filtered = assets.filter(a =>
    a.asset_name?.toLowerCase().includes(search.toLowerCase()) || a.street_address?.toLowerCase().includes(search.toLowerCase()) || a.cross_street?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Asset Locations" description="Manage physical locations and assets such as intersections, curb ramps, driveways, signs, and landmarks."
        helpText="Asset locations represent notable physical points tied to segments. They can be linked to checkpoints and markers for cross-referencing.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyAsset); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Asset</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Asset locations catalog the physical features along documented streets.",
        "Link assets to segments and use them as references for route checkpoints and media markers.",
        "Common types include intersections, curb ramps, driveways, businesses, and signs.",
        "Assets can be searched by name, address, or cross street in the client portal."
      ]} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MapPinned} title="No asset locations" description="Add intersections, curb ramps, businesses, and other notable locations." />
      ) : (
        <div className="grid gap-3">
          {filtered.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPinned className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{a.asset_name}</p>
                    <p className="text-xs text-muted-foreground">{a.street_address || a.cross_street || '—'} · {projectMap[a.project_id] || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'New Asset Location'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project</Label>
                <Select value={form.project_id || 'none'} onValueChange={v => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Segment</Label>
                <Select value={form.street_segment_id || 'none'} onValueChange={v => setForm({ ...form, street_segment_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{segments.map(s => <SelectItem key={s.id} value={s.id}>{s.street_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Street Address</Label><Input value={form.street_address} onChange={e => setForm({ ...form, street_address: e.target.value })} /></div>
              <div><Label>Cross Street</Label><Input value={form.cross_street} onChange={e => setForm({ ...form, cross_street: e.target.value })} /></div>
            </div>
            <div><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>Reference Description</Label><Textarea value={form.reference_description} onChange={e => setForm({ ...form, reference_description: e.target.value })} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.asset_name || !form.project_id}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}