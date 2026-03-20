import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Pencil, Plus } from 'lucide-react';
import FutureReadyPanel from '@/components/ui/FutureReadyPanel';
import { getFutureFeatureBlueprints } from '@/lib/futureArchitecture';

const CATEGORIES = ['workflow', 'data_entry', 'qa', 'publishing', 'client_portal', 'mapping', 'media', 'security', 'architecture'];
const PAGE_KEYS = ['all', 'dashboard', 'route_editor', 'field_session', 'marker_review', 'project_detail', 'media_library', 'system_instructions', 'client_project_viewer'];
const ROLES = ['all', 'super_admin', 'company_admin', 'documenter', 'client_manager', 'client_viewer'];

const emptyInstruction = { instruction_key: '', instruction_title: '', instruction_category: 'workflow', instruction_body: '', target_page: 'all', target_role: 'all', is_active: true, sort_order: 0 };

export default function SystemInstructions() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyInstruction);
  const queryClient = useQueryClient();

  const { data: instructions = [], isLoading } = useQuery({ queryKey: ['instructions'], queryFn: () => base44.entities.SystemInstruction.list('sort_order', 300) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.SystemInstruction.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['instructions'] }); closeForm(); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => base44.entities.SystemInstruction.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['instructions'] }); closeForm(); } });

  const grouped = useMemo(() => instructions.reduce((accumulator, instruction) => { const category = instruction.instruction_category || 'workflow'; accumulator[category] ||= []; accumulator[category].push(instruction); return accumulator; }, {}), [instructions]);
  const futureBlueprints = useMemo(() => getFutureFeatureBlueprints(), []);
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyInstruction); };
  const openEdit = (instruction) => { setEditing(instruction); setForm({ ...emptyInstruction, ...instruction }); setShowForm(true); };
  const handleSave = () => editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form);

  return (
    <div className="space-y-6">
      <PageHeader title="System Instructions" description="Maintain reusable page-and-role-specific instructional content that major workflows can load dynamically.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyInstruction); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Instruction</Button>
      </PageHeader>

      <Card><CardContent className="p-4 space-y-3"><p className="text-sm text-muted-foreground leading-6">Use this page to maintain professional instructional content for internal staff and client viewers. Each instruction can target a page, a role, or all users, making it easier to update operating guidance without rewriting page code.</p><p className="text-sm text-muted-foreground leading-6">Future-ready architecture notes should be stored as practical operating content: explain where the extension hooks live, which current entities they rely on, and what remains intentionally unimplemented so future phases can move quickly without surprising administrators.</p></CardContent></Card>

      <FutureReadyPanel
        title="Future Features / Extension Notes"
        description="Use these architecture notes as the source of truth when adding system instructions for the next product phase. They describe where new capabilities should plug into the current in-house-first workflow without forcing premature implementation."
        items={futureBlueprints}
      />

      {isLoading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div> : instructions.length === 0 ? <EmptyState icon={BookOpen} title="No instructions yet" description="Create role-aware instructions so major pages can render operational guidance from data." /> : (
        <div className="space-y-6">{Object.entries(grouped).map(([category, items]) => (
          <div key={category}><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{category.replace(/_/g, ' ')}</h3><div className="space-y-3">{items.map((instruction) => (
            <Card key={instruction.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-4"><div className="space-y-2"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold">{instruction.instruction_title}</p><Badge variant="outline">{instruction.instruction_key}</Badge><Badge variant="outline">page: {instruction.target_page || 'all'}</Badge><Badge variant="outline">role: {instruction.target_role || 'all'}</Badge>{!instruction.is_active && <Badge variant="destructive">Inactive</Badge>}</div><p className="text-sm text-muted-foreground leading-6 whitespace-pre-wrap">{instruction.instruction_body}</p></div><Button variant="ghost" size="icon" onClick={() => openEdit(instruction)}><Pencil className="w-4 h-4" /></Button></div></CardContent></Card>
          ))}</div></div>
        ))}</div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Instruction' : 'New Instruction'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><div><Label>Key *</Label><Input value={form.instruction_key} onChange={(event) => setForm((current) => ({ ...current, instruction_key: event.target.value }))} /></div><div><Label>Title *</Label><Input value={form.instruction_title} onChange={(event) => setForm((current) => ({ ...current, instruction_title: event.target.value }))} /></div></div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Category</Label><Select value={form.instruction_category} onValueChange={(value) => setForm((current) => ({ ...current, instruction_category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Page</Label><Select value={form.target_page || 'all'} onValueChange={(value) => setForm((current) => ({ ...current, target_page: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAGE_KEYS.map((page) => <SelectItem key={page} value={page}>{page}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Role</Label><Select value={form.target_role || 'all'} onValueChange={(value) => setForm((current) => ({ ...current, target_role: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Instruction Body *</Label><Textarea value={form.instruction_body} onChange={(event) => setForm((current) => ({ ...current, instruction_body: event.target.value }))} className="min-h-[180px]" /></div>
            <div className="flex items-center gap-6"><div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} /><Label>Active</Label></div><div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: parseInt(event.target.value, 10) || 0 }))} className="w-24" /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeForm}>Cancel</Button><Button onClick={handleSave} disabled={!form.instruction_key || !form.instruction_title || !form.instruction_body}>Save Instruction</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
