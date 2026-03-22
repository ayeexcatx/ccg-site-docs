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
import { Plus, MapPinned, Search, Pencil, CopyPlus } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/constants';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';

const emptyAsset = {
  project_id: '', street_segment_id: '', asset_type: 'intersection', asset_name: '',
  street_address: '', cross_street: '', business_name: '', reference_description: '',
  internal_notes: '', client_visible_notes: '',
};

export default function AssetLocations() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAsset);
  const [search, setSearch] = useState('');
  const [sourceCheckpointId, setSourceCheckpointId] = useState('none');
  const [sourceMarkerId, setSourceMarkerId] = useState('none');
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({ queryKey: ['assets'], queryFn: () => base44.entities.AssetLocation.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: checkpoints = [] } = useQuery({ queryKey: ['asset-source-checkpoints'], queryFn: () => base44.entities.RouteCheckpoint.list('sequence_order', 200) });
  const { data: markers = [] } = useQuery({ queryKey: ['asset-source-markers'], queryFn: () => base44.entities.MediaMarker.list('-created_date', 200) });

  const createMut = useMutation({ mutationFn: (data) => base44.entities.AssetLocation.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeForm(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.AssetLocation.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeForm(); } });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyAsset); setSourceCheckpointId('none'); setSourceMarkerId('none'); };
  const openEdit = (asset) => { setEditing(asset); setForm({ ...emptyAsset, ...asset }); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const filtered = assets.filter((asset) => [asset.asset_name, asset.street_address, asset.cross_street].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));
  const checkpointOptions = useMemo(() => checkpoints.filter((checkpoint) => checkpoint.checkpoint_label), [checkpoints]);
  const markerOptions = useMemo(() => markers.filter((marker) => marker.marker_label), [markers]);

  const applyCheckpoint = (id) => {
    const checkpoint = checkpointOptions.find((item) => item.id === id);
    if (!checkpoint) return;
    setSourceCheckpointId(id);
    setForm((current) => ({
      ...current,
      asset_name: checkpoint.checkpoint_label,
      asset_type: checkpoint.checkpoint_type === 'landmark' ? 'landmark' : checkpoint.checkpoint_type === 'intersection' ? 'intersection' : 'custom',
      street_segment_id: checkpoint.street_segment_id || current.street_segment_id,
      reference_description: checkpoint.checkpoint_label,
    }));
  };

  const applyMarker = (id) => {
    const marker = markerOptions.find((item) => item.id === id);
    if (!marker) return;
    setSourceMarkerId(id);
    setForm((current) => ({
      ...current,
      asset_name: marker.marker_label,
      asset_type: marker.marker_type === 'landmark' ? 'landmark' : marker.marker_type === 'intersection' ? 'intersection' : 'custom',
      project_id: marker.project_id || current.project_id,
      reference_description: marker.client_visible_notes || marker.internal_notes || marker.marker_label,
    }));
  };

  const guidance = PAGE_GUIDANCE.asset_locations.sections;

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Locations" description="Optional reusable landmarks and locations for checkpoints, markers, and recurring references." helpText="This page is not required for the main workflow. Use it only when you want a persistent location record you can reuse later.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyAsset); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Asset</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.asset_locations.title, sections: guidance }} />
      <NextStepPanel step={guidance.nextStep} detail="Only pause here when a reusable landmark will save time later. Otherwise continue in route, field, or marker review." />

      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Optional workflow note: most projects do not need manual asset entry. If the information already exists in a checkpoint or marker, copy it here instead of typing it again.</div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : filtered.length === 0 ? <EmptyState icon={MapPinned} title="No asset locations" description="Add reusable landmarks only when they will help multiple workflows." /> : (
        <div className="grid gap-3">
          {filtered.map(asset => (
            <Card key={asset.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MapPinned className="w-5 h-5 text-primary" /></div><div><p className="text-sm font-semibold">{asset.asset_name}</p><p className="text-xs text-muted-foreground">{asset.street_address || asset.cross_street || '—'} · {projectMap[asset.project_id] || '—'}</p></div></div>
                <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</Badge><Button variant="ghost" size="icon" onClick={() => openEdit(asset)}><Pencil className="w-4 h-4" /></Button></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'New Asset Location'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium"><CopyPlus className="w-4 h-4 text-primary" /> Create from existing workflow data</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Copy from checkpoint</Label><Select value={sourceCheckpointId} onValueChange={applyCheckpoint}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select checkpoint...</SelectItem>{checkpointOptions.map((checkpoint) => <SelectItem key={checkpoint.id} value={checkpoint.id}>{checkpoint.checkpoint_label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Copy from marker</Label><Select value={sourceMarkerId} onValueChange={applyMarker}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select marker...</SelectItem>{markerOptions.map((marker) => <SelectItem key={marker.id} value={marker.id}>{marker.marker_label}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} /></div><div><Label>Type</Label><Select value={form.asset_type} onValueChange={value => setForm({ ...form, asset_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ASSET_TYPE_LABELS).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Project</Label><Select value={form.project_id || 'none'} onValueChange={value => setForm({ ...form, project_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select...</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div><div><Label>Segment</Label><Select value={form.street_segment_id || 'none'} onValueChange={value => setForm({ ...form, street_segment_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select...</SelectItem>{segments.map(segment => <SelectItem key={segment.id} value={segment.id}>{segment.street_name}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Street Address</Label><Input value={form.street_address} onChange={e => setForm({ ...form, street_address: e.target.value })} /></div><div><Label>Cross Street</Label><Input value={form.cross_street} onChange={e => setForm({ ...form, cross_street: e.target.value })} /></div></div>
            <div><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>Reference Description</Label><Textarea value={form.reference_description} onChange={e => setForm({ ...form, reference_description: e.target.value })} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeForm}>Cancel</Button><Button onClick={handleSave} disabled={!form.asset_name}>Save Asset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
