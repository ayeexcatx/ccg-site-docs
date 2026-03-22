import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { DocumentationPageIntro, NextStepPanel } from '@/components/ui/OperatingGuidance';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Camera, Search, Pencil, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { VIEW_TYPE_LABELS } from '@/lib/constants';
import { CAPTURE_SESSION_STATUSES, getSessionOrderLabel, normalizeCaptureSessionStatus } from '@/lib/sessionWorkflow';
import { PAGE_GUIDANCE, REFERENCE_CODE_HELPER } from '@/lib/workflowGuidance';

const emptySession = {
  project_id: '', street_segment_id: '', session_name: '', session_code: '', assigned_documenter_id: '',
  session_status: 'planning', capture_date: '', capture_method: 'video', view_type: 'profile',
  walking_direction_description: '', route_capture_mode: 'manual_route', weather_notes: '',
  field_notes_internal: '', field_notes_client_visible: '', qa_status: 'not_reviewed', sequence_order: 0,
};

export default function CaptureSessions() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySession);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['sessions'], queryFn: () => base44.entities.CaptureSession.list('sequence_order', 400) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: users = [] } = useQuery({ queryKey: ['user-profiles'], queryFn: () => base44.entities.UserProfile.list('-created_date', 200) });

  const createMut = useMutation({ mutationFn: (data) => base44.entities.CaptureSession.create({ ...data, session_status: normalizeCaptureSessionStatus(data.session_status) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); closeForm(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.CaptureSession.update(id, { ...data, session_status: normalizeCaptureSessionStatus(data.session_status) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); closeForm(); } });
  const reorderMut = useMutation({ mutationFn: ({ id, sequence_order }) => base44.entities.CaptureSession.update(id, { sequence_order }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }) });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySession); };
  const openEdit = (session) => { setEditing(session); setForm({ ...emptySession, ...session, session_status: normalizeCaptureSessionStatus(session.session_status) }); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const segmentMap = Object.fromEntries(segments.map((segment) => [segment.id, segment.street_name]));
  const documenters = users.filter(user => ['super_admin', 'company_admin', 'documenter'].includes(user.role));

  const filtered = useMemo(() => sessions
    .map((session) => ({ ...session, session_status: normalizeCaptureSessionStatus(session.session_status) }))
    .filter((session) => [session.session_name, session.session_code, segmentMap[session.street_segment_id]].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [sessions, search, segmentMap]);

  const moveSession = async (session, direction) => {
    const group = filtered.filter((item) => item.street_segment_id === session.street_segment_id).sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
    const index = group.findIndex((item) => item.id === session.id);
    const swap = index + direction;
    if (swap < 0 || swap >= group.length) return;
    const first = group[index];
    const second = group[swap];
    await Promise.all([
      reorderMut.mutateAsync({ id: first.id, sequence_order: second.sequence_order ?? swap }),
      reorderMut.mutateAsync({ id: second.id, sequence_order: first.sequence_order ?? index }),
    ]);
  };

  const grouped = useMemo(() => filtered.reduce((acc, session) => {
    const key = session.street_segment_id || 'unassigned';
    acc[key] = [...(acc[key] || []), session];
    return acc;
  }, {}), [filtered]);

  const guidance = PAGE_GUIDANCE.capture_sessions.sections;

  return (
    <div className="space-y-6">
      <PageHeader title="Capture Sessions" description="Plan and manage documentation runs — each session represents one capture pass tied to a segment." helpText="Ordered sessions drive both recommended recording order and upload matching suggestions.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptySession); setShowForm(true); }}><Plus className="w-4 h-4" /> New Session</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.capture_sessions.title, sections: guidance }} />
      <NextStepPanel step={guidance.nextStep} detail="Keep the session order realistic before you start route planning so the field team and upload team are following the same sequence." />

      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-sm font-semibold mb-3">Capture session statuses</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CAPTURE_SESSION_STATUSES.map((status) => (
            <div key={status.value} className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2"><StatusBadge status={status.value} /><Info className="w-3.5 h-3.5 text-muted-foreground" /></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{status.description}</p>
            </div>
          ))}
        </div>
      </div>

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
        <div className="grid gap-4">
          {Object.entries(grouped).map(([segmentId, segmentSessions]) => (
            <div key={segmentId} className="space-y-3">
              <div>
                <p className="text-sm font-semibold">{segmentMap[segmentId] || 'Unassigned segment'}</p>
                <p className="text-xs text-muted-foreground">Recommended recording order and suggested upload matching order follow this list from top to bottom.</p>
              </div>
              {segmentSessions.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)).map((session, index) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Camera className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-sm font-semibold">#{getSessionOrderLabel(session, index)} · {session.session_name}</p>
                        <p className="text-xs text-muted-foreground">{projectMap[session.project_id] || '—'} · {VIEW_TYPE_LABELS[session.view_type] || session.view_type} · {session.capture_date || 'No date'} · Upload suggestion slot {index + 1}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={session.session_status} />
                      <StatusBadge status={session.qa_status} />
                      <Button variant="ghost" size="icon" onClick={() => moveSession(session, -1)}><ArrowUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveSession(session, 1)}><ArrowDown className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(session)}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Session' : 'New Capture Session'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Session Name *</Label><Input value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} /></div>
              <div><Label>Session Code</Label><Input value={form.session_code} onChange={e => setForm({ ...form, session_code: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">{REFERENCE_CODE_HELPER}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project *</Label><Select value={form.project_id || 'none'} onValueChange={value => setForm({ ...form, project_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select...</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Segment</Label><Select value={form.street_segment_id || 'none'} onValueChange={value => setForm({ ...form, street_segment_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select...</SelectItem>{segments.filter(segment => !form.project_id || segment.project_id === form.project_id).map(segment => <SelectItem key={segment.id} value={segment.id}>{segment.street_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capture Method</Label><Select value={form.capture_method} onValueChange={value => setForm({ ...form, capture_method: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['photo', 'video', 'video_and_photo', 'video_360', 'mixed'].map(method => <SelectItem key={method} value={method}>{method.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>View Type</Label><Select value={form.view_type} onValueChange={value => setForm({ ...form, view_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(VIEW_TYPE_LABELS).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assigned Documenter</Label><Select value={form.assigned_documenter_id || 'none'} onValueChange={value => setForm({ ...form, assigned_documenter_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{documenters.map(user => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Capture Date</Label><Input type="date" value={form.capture_date} onChange={e => setForm({ ...form, capture_date: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label><Select value={form.session_status} onValueChange={value => setForm({ ...form, session_status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CAPTURE_SESSION_STATUSES.map(status => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">{CAPTURE_SESSION_STATUSES.find((status) => status.value === form.session_status)?.description}</p></div>
            <div><Label>Session Order</Label><Input type="number" value={form.sequence_order} onChange={e => setForm({ ...form, sequence_order: parseInt(e.target.value, 10) || 0 })} /><p className="mt-1 text-xs text-muted-foreground">Lower numbers appear earlier in the recommended recording and upload order.</p></div>
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
