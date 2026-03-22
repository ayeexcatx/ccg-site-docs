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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { BookOpen, Plus, Search } from 'lucide-react';

const emptyInstruction = { instruction_title: '', instruction_body: '', target_page: 'all', is_active: true };

export default function SystemInstructions() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyInstruction);
  const queryClient = useQueryClient();

  const { data: instructions = [], isLoading } = useQuery({ queryKey: ['system-instructions'], queryFn: () => base44.entities.SystemInstruction.list('sort_order', 200) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.SystemInstruction.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-instructions'] }); setShowForm(false); setForm(emptyInstruction); } });
  const filtered = useMemo(() => instructions.filter((item) => [item.instruction_title, item.instruction_body, item.target_page].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [instructions, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="System Instructions" description="Manage the role- and page-scoped guidance records that still matter in the v2 workflow.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Instruction</Button>
      </PageHeader>
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.system_instructions.title, sections: PAGE_GUIDANCE.system_instructions.sections }} />
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search instructions" /></div>
      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={BookOpen} title="No instructions found" description="Create scoped guidance only where the v2 workflow still needs it." /> : (
        <div className="grid gap-3">
          {filtered.map((item) => <Card key={item.id}><CardContent className="p-4 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.instruction_title}</p><p className="text-xs text-muted-foreground">Page: {item.target_page || 'all'}</p><p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{item.instruction_body}</p></div><StatusBadge status={item.is_active ? 'active' : 'inactive'} /></CardContent></Card>)}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyInstruction); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New system instruction</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><Label>Title *</Label><Input value={form.instruction_title} onChange={(event) => setForm((current) => ({ ...current, instruction_title: event.target.value }))} /></div><div><Label>Target page</Label><Input value={form.target_page} onChange={(event) => setForm((current) => ({ ...current, target_page: event.target.value }))} placeholder="all / sessions / media ..." /></div><div><Label>Body</Label><Textarea value={form.instruction_body} onChange={(event) => setForm((current) => ({ ...current, instruction_body: event.target.value }))} rows={6} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyInstruction); }}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={!form.instruction_title}>Create Instruction</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
