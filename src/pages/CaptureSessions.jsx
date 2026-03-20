import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Camera, Search, Pencil } from 'lucide-react';
import { VIEW_TYPE_LABELS } from '@/lib/constants';

const emptySession = {
  project_id: '', street_segment_id: '', session_name: '', session_code: '', assigned_documenter_id: '',
  session_status: 'planned', capture_date: '', capture_method: 'video', view_type: 'profile',
  walking_direction_description: '', route_capture_mode: 'manual_route', weather_notes: '',
  field_notes_internal: '', field_notes_client_visible: '', qa_status: 'not_reviewed'
};

export default function CaptureSessions() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySession);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.CaptureSession.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: users = [] } = useQuery({ queryKey: ['user-profiles'], queryFn: () => base44.entities.UserProfile.list('-created_date', 200) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CaptureSession.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); closeForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySession); };
  const openEdit = (s) => { setEditing(s); setForm(s); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });
  const documenters = users.filter(u => ['super_admin', 'company_admin', 'documenter'].includes(u.role));

  const filtered = sessions.filter(s => s.session_name?.toLowerCase().includes(search.toLowerCase()) || s.session_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Capture Sessions" description="Plan and manage documentation runs — each session represents a single field capture effort."
        helpText="Sessions tie together a project, segment, documenter, and capture method. They track the lifecycle from planning through QA and publishing.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptySession); setShowForm(true); }}><Plus className="w-4 h-4" /> New Session</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Create a session for each planned documentation run (e.g., a specific video walk of a street).",
        "Assign a documenter, select the capture method (photo, video, 360°), and define the view type.",
        "Route capture mode determines how location data will be recorded — manual route drawing is the default in-house method.",
        "After field capture, upload media and link it to the session for review and publishing."
      ]} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Camera} title="No sessions found" description="Create a capture session to plan field documentation work." />
      ) : (
        <div className="grid gap-3">
          {filtered.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.session_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {projectMap[s.project_id] || '—'} · {s.capture_method} · {VIEW_TYPE_LABELS[s.view_type] || s.view_type} · {s.capture_date || 'No date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.session_status} />
                  <StatusBadge status={s.qa_status} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Session' : 'New Capture Session'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Session Name *</Label><Input value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} /></div>
              <div><Label>Session Code</Label><Input value={form.session_code} onChange={e => setForm({ ...form, session_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project *</Label>
                <Select value={form.project_id || 'none'} onValueChange={v => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Segment</Label>
                <Select value={form.street_segment_id || 'none'} onValueChange={v => setForm({ ...form, street_segment_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{segments.filter(s => !form.project_id || s.project_id === form.project_id).map(s => <SelectItem key={s.id} value={s.id}>{s.street_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capture Method</Label>
                <Select value={form.capture_method} onValueChange={v => setForm({ ...form, capture_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['photo', 'video', 'video_and_photo', 'video_360', 'mixed'].map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>View Type</Label>
                <Select value={form.view_type} onValueChange={v => setForm({ ...form, view_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(VIEW_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assigned Documenter</Label>
                <Select value={form.assigned_documenter_id || 'none'} onValueChange={v => setForm({ ...form, assigned_documenter_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Unassigned</SelectItem>{documenters.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Capture Date</Label><Input type="date" value={form.capture_date} onChange={e => setForm({ ...form, capture_date: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.session_status} onValueChange={v => setForm({ ...form, session_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['planned', 'ready', 'in_progress', 'paused', 'uploaded', 'under_review', 'approved', 'published'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Walking Direction</Label><Input value={form.walking_direction_description} onChange={e => setForm({ ...form, walking_direction_description: e.target.value })} placeholder="e.g. Northbound from Oak Ave to Pine St" /></div>
            <div><Label>Internal Field Notes</Label><Textarea value={form.field_notes_internal} onChange={e => setForm({ ...form, field_notes_internal: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.session_name || !form.project_id}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}