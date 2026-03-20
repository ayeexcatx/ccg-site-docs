import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Pencil } from 'lucide-react';

const CATEGORIES = ['workflow', 'data_entry', 'qa', 'publishing', 'client_portal', 'mapping', 'media', 'security'];

const emptyInstruction = {
  instruction_key: '', instruction_title: '', instruction_category: 'workflow',
  instruction_body: '', target_page: '', is_active: true, sort_order: 0
};

export default function SystemInstructions() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyInstruction);
  const queryClient = useQueryClient();

  const { data: instructions = [], isLoading } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => base44.entities.SystemInstruction.list('sort_order', 200),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.SystemInstruction.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['instructions'] }); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemInstruction.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['instructions'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyInstruction); };
  const openEdit = (i) => { setEditing(i); setForm(i); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const grouped = {};
  instructions.forEach(i => {
    const cat = i.instruction_category || 'workflow';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  return (
    <div>
      <PageHeader title="System Instructions" description="Maintain internal operating instructions and helper documentation for the CCG team."
        helpText="Instructions defined here can be displayed as helper text throughout the app, targeted by page and user role.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyInstruction); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Instruction</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : instructions.length === 0 ? (
        <EmptyState icon={BookOpen} title="No instructions yet" description="Add operating instructions that will be available as helper text throughout the app." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{category.replace(/_/g, ' ')}</h3>
              <div className="space-y-2">
                {items.map(i => (
                  <Card key={i.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold">{i.instruction_title}</p>
                            <Badge variant="outline" className="text-[10px]">{i.instruction_key}</Badge>
                            {i.target_page && <Badge variant="outline" className="text-[10px]">{i.target_page}</Badge>}
                            {!i.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{i.instruction_body}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Instruction' : 'New Instruction'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Key *</Label><Input value={form.instruction_key} onChange={e => setForm({ ...form, instruction_key: e.target.value })} placeholder="e.g. route_editor_howto" /></div>
              <div><Label>Title *</Label><Input value={form.instruction_title} onChange={e => setForm({ ...form, instruction_title: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.instruction_category} onValueChange={v => setForm({ ...form, instruction_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Page</Label><Input value={form.target_page} onChange={e => setForm({ ...form, target_page: e.target.value })} placeholder="e.g. route_editor" /></div>
            </div>
            <div><Label>Body *</Label><Textarea value={form.instruction_body} onChange={e => setForm({ ...form, instruction_body: e.target.value })} className="min-h-[120px]" /></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-20" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.instruction_key || !form.instruction_title || !form.instruction_body}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}