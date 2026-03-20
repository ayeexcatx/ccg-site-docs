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
import { Plus, MessageSquare, Search, Pencil } from 'lucide-react';

const CASE_TYPES = ['claim_review', 'internal_review', 'qa_review', 'client_question', 'export_request'];
const CASE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const emptyCase = {
  project_id: '', client_organization_id: '', case_title: '', case_type: 'internal_review', status: 'open',
  related_address: '', related_intersection: '', related_business: '', summary: '',
  internal_notes: '', client_visible_notes: ''
};

export default function ReviewCases() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCase);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['review-cases'],
    queryFn: () => base44.entities.ReviewCase.list('-created_date', 200),
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.ClientOrganization.list('-created_date', 100) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.ReviewCase.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['review-cases'] }); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReviewCase.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['review-cases'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyCase); };
  const openEdit = (c) => { setEditing(c); setForm(c); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });

  const filtered = cases.filter(c =>
    c.case_title?.toLowerCase().includes(search.toLowerCase()) || c.related_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Review Cases" description="Track claim reviews, QA reviews, client questions, and export requests."
        helpText="Cases help organize review workflows. Link media and markers to cases for structured evidence review.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyCase); setShowForm(true); }}><Plus className="w-4 h-4" /> New Case</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Create cases for claim reviews, QA reviews, or client questions that need investigation.",
        "Link a case to a project and client for proper tracking and access control.",
        "Use the address, intersection, and business fields to identify the area of concern.",
        "Internal notes stay visible only to CCG staff; client-visible notes can be shared in the portal."
      ]} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No review cases" description="Create a case to track claim reviews, QA tasks, or client questions." />
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.case_title}</p>
                    <p className="text-xs text-muted-foreground">{projectMap[c.project_id] || '—'} · {c.related_address || c.related_intersection || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{c.case_type?.replace(/_/g, ' ')}</Badge>
                  <StatusBadge status={c.status} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Case' : 'New Review Case'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Case Title *</Label><Input value={form.case_title} onChange={e => setForm({ ...form, case_title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.case_type} onValueChange={v => setForm({ ...form, case_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
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
              <div><Label>Client</Label>
                <Select value={form.client_organization_id || 'none'} onValueChange={v => setForm({ ...form, client_organization_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Address</Label><Input value={form.related_address} onChange={e => setForm({ ...form, related_address: e.target.value })} /></div>
              <div><Label>Intersection</Label><Input value={form.related_intersection} onChange={e => setForm({ ...form, related_intersection: e.target.value })} /></div>
              <div><Label>Business</Label><Input value={form.related_business} onChange={e => setForm({ ...form, related_business: e.target.value })} /></div>
            </div>
            <div><Label>Summary</Label><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.case_title}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}