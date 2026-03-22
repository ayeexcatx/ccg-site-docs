import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users } from 'lucide-react';

const ROLES = ['super_admin', 'company_admin', 'documenter', 'client_manager', 'client_viewer'];
const emptyUser = { full_name: '', email: '', role: 'client_viewer', client_organization_id: '', job_title: '', phone: '', is_active: true };

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['user-profiles'], queryFn: () => base44.entities.UserProfile.list('-created_date', 200) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.ClientOrganization.list('-created_date', 100) });
  const createMut = useMutation({ mutationFn: (data) => base44.entities.UserProfile.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-profiles'] }); setShowForm(false); setForm(emptyUser); } });

  const clientMap = Object.fromEntries(clients.map((client) => [client.id, client.name]));
  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesSearch = [user.full_name, user.email, clientMap[user.client_organization_id]].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }), [users, search, roleFilter, clientMap]);

  return (
    <div className="space-y-6">
      <PageHeader title="User Profiles" description="Manage staff and client portal access roles for the v2 session and timeline workflow.">
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add User</Button>
      </PageHeader>

      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.users.title, sections: PAGE_GUIDANCE.users.sections }} />

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users or organizations" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((role) => <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredUsers.length === 0 ? <EmptyState icon={Users} title="No users found" description="Create a user profile to grant workflow or portal access." /> : (
        <div className="grid gap-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email} · {clientMap[user.client_organization_id] || 'Internal user'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{user.role?.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{user.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyUser); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New user profile</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></div>
              <div><Label>Email *</Label><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Role</Label><Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Client organization</Label><Select value={form.client_organization_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, client_organization_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyUser); }}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.full_name || !form.email}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
