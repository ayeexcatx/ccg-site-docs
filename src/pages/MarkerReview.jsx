import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Bookmark, Search, Pencil, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { MARKER_TYPE_LABELS } from '@/lib/constants';

const CONFIDENCE_COLORS = {
  manual: 'bg-blue-100 text-blue-800',
  estimated: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  ai_suggested_future: 'bg-purple-100 text-purple-800',
};

const emptyMarker = {
  project_id: '', media_file_id: '', marker_type: 'intersection', marker_label: '',
  timestamp_seconds: 0, confidence_level: 'manual', internal_notes: '', client_visible_notes: '',
  is_client_visible: true
};

export default function MarkerReview() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMarker);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: markers = [], isLoading } = useQuery({
    queryKey: ['markers'],
    queryFn: () => base44.entities.MediaMarker.list('-created_date', 200),
  });
  const { data: mediaFiles = [] } = useQuery({ queryKey: ['media'], queryFn: () => base44.entities.MediaFile.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.MediaMarker.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['markers'] }); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaMarker.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['markers'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyMarker); };
  const openEdit = (m) => { setEditing(m); setForm(m); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const mediaMap = {};
  mediaFiles.forEach(m => { mediaMap[m.id] = m.media_title; });
  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });

  const filtered = markers.filter(m => m.marker_label?.toLowerCase().includes(search.toLowerCase()));

  const formatTimestamp = (s) => {
    if (!s && s !== 0) return '—';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(Math.floor(secs)).padStart(2, '0')}`;
  };

  return (
    <div>
      <PageHeader title="Marker Review" description="Review and manage timeline markers for all media files. Confirm timestamps and edit marker details."
        helpText="Markers are searchable reference points within media files — intersections, landmarks, curb ramps, etc.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyMarker); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Marker</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Markers represent specific points in a media file — e.g., an intersection at 2:15 in a video.",
        "Confidence levels: Manual = placed by hand, Estimated = auto-generated from field events, Confirmed = verified by a reviewer.",
        "During review, confirm estimated timestamps by comparing video content to checkpoint labels.",
        "Client-visible markers appear in the client portal. Internal markers are for CCG staff only.",
        "Future versions will support AI-suggested markers based on video content analysis."
      ]} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search markers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bookmark} title="No markers found" description="Create markers to reference specific points in your media files." />
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{m.marker_label}</p>
                        <Badge variant="outline" className="text-[10px]">{MARKER_TYPE_LABELS[m.marker_type] || m.marker_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mediaMap[m.media_file_id] || '—'} · {projectMap[m.project_id] || '—'} · @ {formatTimestamp(m.timestamp_seconds)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${CONFIDENCE_COLORS[m.confidence_level] || ''}`}>
                      {m.confidence_level === 'confirmed' ? <CheckCircle className="w-3 h-3 mr-1" /> : m.confidence_level === 'estimated' ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                      {m.confidence_level}
                    </Badge>
                    {m.is_client_visible && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Client Visible</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Marker' : 'New Marker'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Label *</Label><Input value={form.marker_label} onChange={e => setForm({ ...form, marker_label: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.marker_type} onValueChange={v => setForm({ ...form, marker_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(MARKER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Confidence</Label>
                <Select value={form.confidence_level} onValueChange={v => setForm({ ...form, confidence_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="estimated">Estimated</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Media File</Label>
                <Select value={form.media_file_id || 'none'} onValueChange={v => setForm({ ...form, media_file_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{mediaFiles.map(m => <SelectItem key={m.id} value={m.id}>{m.media_title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Timestamp (seconds)</Label><Input type="number" value={form.timestamp_seconds} onChange={e => setForm({ ...form, timestamp_seconds: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_client_visible} onCheckedChange={v => setForm({ ...form, is_client_visible: v })} /><Label>Client Visible</Label></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
            <div><Label>Client-Visible Notes</Label><Textarea value={form.client_visible_notes} onChange={e => setForm({ ...form, client_visible_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.marker_label || !form.media_file_id}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}