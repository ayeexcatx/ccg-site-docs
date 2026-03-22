import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE, REFERENCE_CODE_HELPER } from '@/lib/workflowGuidance';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera, Plus, Search } from 'lucide-react';

const emptySession = {
  project_id: '', session_name: '', session_code: '', session_status: 'planned', capture_date: '', capture_method: 'video', view_type: 'profile', qa_status: 'not_reviewed', walking_direction_description: '', weather_notes: '', field_notes_internal: '', field_notes_client_visible: '',
};

export default function CaptureSessions() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySession);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.CaptureSession.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['capture-sessions'] }); setShowForm(false); setForm(emptySession); } });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const filtered = useMemo(() => sessions.filter((session) => {
    const matchesProject = projectFilter === 'all' || session.project_id === projectFilter;
    const haystack = [session.session_name, session.session_code, projectMap[session.project_id], session.view_type, session.capture_method].filter(Boolean).join(' ').toLowerCase();
    return matchesProject && haystack.includes(search.toLowerCase());
  }), [sessions, projectFilter, search, projectMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="Capture Sessions" description="Manage the actual field capture sessions that drive media collection, entry creation, and timeline indexing.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Session</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.capture_sessions.title, sections: PAGE_GUIDANCE.capture_sessions.sections }} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search sessions" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : filtered.length === 0 ? <EmptyState icon={Camera} title="No capture sessions yet" description="Create a session for each real field recording workflow you need to run." /> : (
        <div className="grid gap-3">
          {filtered.map((session) => (
            <Card key={session.id}><CardContent className="p-4 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{session.session_name}</p><p className="text-xs text-muted-foreground">{projectMap[session.project_id] || 'No project'} · {session.capture_method} · {session.view_type}</p></div><div className="flex flex-wrap gap-2 justify-end"><StatusBadge status={session.session_status} /><StatusBadge status={session.qa_status} /></div></CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptySession); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Capture Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Project *</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Session name *</Label><Input value={form.session_name} onChange={(event) => setForm((current) => ({ ...current, session_name: event.target.value }))} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Session code</Label><Input value={form.session_code} onChange={(event) => setForm((current) => ({ ...current, session_code: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">{REFERENCE_CODE_HELPER}</p></div>
              <div><Label>Capture method</Label><Select value={form.capture_method} onValueChange={(value) => setForm((current) => ({ ...current, capture_method: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['photo', 'video', 'video_and_photo', 'video_360', 'mixed'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>View type</Label><Select value={form.view_type} onValueChange={(value) => setForm((current) => ({ ...current, view_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['profile', 'curb_line_edge_of_pavement', 'cross_section', '360_walk', 'reverse_view', 'custom'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Walking direction / run description</Label><Textarea value={form.walking_direction_description} onChange={(event) => setForm((current) => ({ ...current, walking_direction_description: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setForm(emptySession); }}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={!form.project_id || !form.session_name}>Create Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
