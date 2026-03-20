import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building2, Search, Pencil } from 'lucide-react';

const emptyClient = { name: '', code: '', status: 'active', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', billing_notes: '', default_access_mode: 'login', internal_notes: '', client_visible_notes: '' };

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.ClientOrganization.list('-created_date', 100),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.ClientOrganization.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientOrganization.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyClient); };
  const openEdit = (c) => { setEditing(c); setForm(c); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Client Organizations"
        description="Manage the companies and municipalities that hire CCG for pre-construction documentation."
        helpText="Each client organization can have multiple projects, users, and portal access settings."
      >
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyClient); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </PageHeader>

      <DocumentationPageIntro
        header={{
          title: 'Client Organization Operating Overview',
          purpose: 'Client organizations anchor portal access, project ownership, and communication boundaries across the documentation program.',
          role: 'Company admins and operational managers maintain these records so downstream users, projects, and publication rules inherit the correct client context.',
          workflowSummary: 'Create or update the client organization, confirm contact and access defaults, then attach users and projects to that organization.',
          visibilityRules: 'Internal billing and operational notes stay company-side. Only curated client-visible notes should be written for information intended to appear in portal experiences.',
          nextSteps: 'After saving the organization, create linked projects and assign client-facing user profiles to the same Base44 client record.'
        }}
        guide={{
          title: 'Client Record Guidance',
          sections: [
            { heading: 'Why This Matters', body: 'Keeping the client record accurate prevents portal leakage across organizations and keeps current in-house workflows aligned with the Base44 entity model.' },
            { heading: 'Operational Reminder', body: 'Default access settings should reflect how CCG currently releases information. Do not use this page to bypass project-level publish review.' },
          ],
        }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No clients found" description="Create your first client organization to start managing projects." />
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code} · {c.primary_contact_name || 'No contact'} · {c.primary_contact_email || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'New Client Organization'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Organization name" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. CITY-LA" /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name</Label><Input value={form.primary_contact_name} onChange={e => setForm({ ...form, primary_contact_name: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input value={form.primary_contact_email} onChange={e => setForm({ ...form, primary_contact_email: e.target.value })} /></div>
            </div>
            <div><Label>Contact Phone</Label><Input value={form.primary_contact_phone} onChange={e => setForm({ ...form, primary_contact_phone: e.target.value })} /></div>
            <div><Label>Internal Notes (company-only)</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} placeholder="Only visible to CCG staff" /></div>
            <div><Label>Client-Visible Notes</Label><Textarea value={form.client_visible_notes} onChange={e => setForm({ ...form, client_visible_notes: e.target.value })} placeholder="Visible to client users" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.code}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}