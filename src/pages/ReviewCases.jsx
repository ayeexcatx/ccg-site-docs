import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { MessageSquare, Plus, Search } from 'lucide-react';

const emptyCase = { project_id: '', case_title: '', case_type: 'client_question', summary: '', status: 'open', client_visible_notes: '' };

export default function ReviewCases() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCase);
  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({ queryKey: ['review-cases'], queryFn: () => base44.entities.ReviewCase.list('-created_date', 200) });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.ReviewCase.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['review-cases'] }); setShowForm(false); setForm(emptyCase); } });

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const filtered = useMemo(() => cases.filter((item) => [item.case_title, item.summary, projectMap[item.project_id], item.client_visible_notes].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [cases, search, projectMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="Review Cases" description="Track post-delivery questions, issues, and follow-up requests tied to projects and released content.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Case</Button>
      </PageHeader>
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.review_cases.title, sections: PAGE_GUIDANCE.review_cases.sections }} />
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search review cases" /></div>
      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={MessageSquare} title="No review cases" description="Create a case when a project, session, or release package needs follow-up." /> : (
        <div className="grid gap-3">
          {filtered.map((item) => <Card key={item.id}><CardContent className="p-4 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{item.case_title || 'Untitled case'}</p><p className="text-xs text-muted-foreground">{projectMap[item.project_id] || 'No project'} · {item.summary || 'No summary'}</p></div><div className="flex gap-2 flex-wrap"><StatusBadge status={item.status} /><StatusBadge status={item.case_type || 'client_question'} /></div></CardContent></Card>)}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyCase); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New review case</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Project</Label><Select value={form.project_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, project_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Title *</Label><Input value={form.case_title} onChange={(event) => setForm((current) => ({ ...current, case_title: event.target.value }))} /></div><div><Label>Case type</Label><Select value={form.case_type} onValueChange={(value) => setForm((current) => ({ ...current, case_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['claim_review', 'internal_review', 'qa_review', 'client_question', 'export_request'].map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Summary</Label><Textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyCase); }}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={!form.case_title}>Create Case</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
