import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import PublishBadge from '@/components/ui/PublishBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, FolderOpen, Search, ArrowRight } from 'lucide-react';

const emptyProject = {
  client_organization_id: '', project_name: '', project_code: '', contract_number: '', municipality: '', county: '', state: '',
  project_status: 'draft', documentation_status: 'not_started', projected_start_date: '', documentation_date: '',
  project_type: '', work_scope_summary: '', project_limits_description: '', address_range_summary: '',
  include_photos: true, include_standard_video: true, include_360_video: false,
  published_to_client: false, client_portal_summary: '', internal_notes: '', client_visible_notes: ''
};

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.ClientOrganization.list('-created_date', 100) });
  const { data: sessions = [] } = useQuery({ queryKey: ['capture-sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 200) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.Project.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); setForm(emptyProject); } });

  const clientMap = Object.fromEntries(clients.map((client) => [client.id, client.name]));
  const sessionCounts = Object.fromEntries(projects.map((project) => [project.id, sessions.filter((session) => session.project_id === project.id).length]));
  const filtered = useMemo(() => projects.filter((project) => {
    const haystack = [project.project_name, project.project_code, project.municipality, clientMap[project.client_organization_id]].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.project_status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [projects, search, statusFilter, clientMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Top-level project records for the session-first documentation workflow.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Project</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.projects.title, sections: PAGE_GUIDANCE.projects.sections }} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['draft', 'active', 'in_review', 'published', 'archived'].map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No projects found" description="Create your first documentation project to get started." /> : (
        <div className="grid gap-3">
          {filtered.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{project.project_name}</p>
                    <p className="text-xs text-muted-foreground">{project.project_code} · {clientMap[project.client_organization_id] || 'No client'} · {sessionCounts[project.id] || 0} sessions</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <StatusBadge status={project.project_status} />
                    <StatusBadge status={project.documentation_status} />
                    <PublishBadge state={project.published_to_client ? 'client_published' : 'draft_data'} />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyProject); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project Name *</Label><Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
              <div><Label>Project Code *</Label><Input value={form.project_code} onChange={e => setForm({ ...form, project_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client Organization</Label><Select value={form.client_organization_id || 'none'} onValueChange={v => setForm({ ...form, client_organization_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select client...</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Contract Number</Label><Input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} /></div>
            </div>
            <div><Label>Work Scope Summary</Label><Textarea value={form.work_scope_summary} onChange={e => setForm({ ...form, work_scope_summary: e.target.value })} /></div>
            <div><Label>Project Limits</Label><Textarea value={form.project_limits_description} onChange={e => setForm({ ...form, project_limits_description: e.target.value })} /></div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2"><Switch checked={form.include_photos} onCheckedChange={v => setForm({ ...form, include_photos: v })} /><Label>Photos</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.include_standard_video} onCheckedChange={v => setForm({ ...form, include_standard_video: v })} /><Label>Standard Video</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.include_360_video} onCheckedChange={v => setForm({ ...form, include_360_video: v })} /><Label>360° Video</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyProject); }}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.project_name || !form.project_code}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
