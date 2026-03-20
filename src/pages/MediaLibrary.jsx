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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileVideo, Search, Image, Video, File } from 'lucide-react';
import { VIEW_TYPE_LABELS } from '@/lib/constants';

const MEDIA_TYPES = ['photo', 'video', 'video_360', 'thumbnail', 'preview_clip', 'document', 'export'];
const MEDIA_ICONS = { photo: Image, video: Video, video_360: Video, thumbnail: Image, preview_clip: Video, document: File, export: File };

const emptyMedia = {
  project_id: '', street_segment_id: '', capture_session_id: '', media_type: 'video',
  media_title: '', original_filename: '', storage_mode: 'native_upload', file_url: '',
  thumbnail_url: '', view_type: 'profile', direction_label: '', side_of_street: 'both',
  is_primary_for_segment: false, publish_to_client: false, processing_status: 'uploaded',
  internal_notes: '', client_visible_notes: ''
};

export default function MediaLibrary() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMedia);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: mediaFiles = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.MediaFile.list('-created_date', 200),
  });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 100) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.StreetSegment.list('sequence_order', 200) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => base44.entities.CaptureSession.list('-created_date', 100) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.MediaFile.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); closeForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaFile.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyMedia); };
  const openEdit = (m) => { setEditing(m); setForm(m); setShowForm(true); };
  const handleSave = () => { editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form); };

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.project_name; });

  const filtered = mediaFiles.filter(m => {
    const matchSearch = m.media_title?.toLowerCase().includes(search.toLowerCase()) || m.original_filename?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || m.media_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      <PageHeader title="Media Library" description="Manage all uploaded and registered media files across projects."
        helpText="Media files can be uploaded natively or registered as external links. Each file is tied to a project, segment, and session.">
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyMedia); setShowForm(true); }}><Plus className="w-4 h-4" /> Register Media</Button>
      </PageHeader>

      <HowThisWorks items={[
        "Register media files by providing metadata — either upload natively or link to external storage.",
        "Each media file should be linked to a project, segment, and capture session for proper organization.",
        "Set view type, direction, and side of street to enable structured browsing.",
        "Toggle 'Publish to Client' to make specific media visible in the client portal.",
        "Future versions will support batch upload, automated processing, and AI-assisted tagging."
      ]} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search media..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEDIA_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileVideo} title="No media files found" description="Register or upload media files to build your documentation library." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const MediaIcon = MEDIA_ICONS[m.media_type] || File;
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(m)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <MediaIcon className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.media_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{projectMap[m.project_id] || '—'} · {VIEW_TYPE_LABELS[m.view_type] || m.view_type}</p>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{m.media_type}</Badge>
                        <StatusBadge status={m.processing_status} />
                        {m.publish_to_client && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Published</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Media' : 'Register Media File'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.media_title} onChange={e => setForm({ ...form, media_title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Media Type</Label>
                <Select value={form.media_type} onValueChange={v => setForm({ ...form, media_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEDIA_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>View Type</Label>
                <Select value={form.view_type} onValueChange={v => setForm({ ...form, view_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(VIEW_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
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
              <div><Label>Session</Label>
                <Select value={form.capture_session_id || 'none'} onValueChange={v => setForm({ ...form, capture_session_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select...</SelectItem>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>File URL</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.publish_to_client} onCheckedChange={v => setForm({ ...form, publish_to_client: v })} /><Label>Publish to Client</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_primary_for_segment} onCheckedChange={v => setForm({ ...form, is_primary_for_segment: v })} /><Label>Primary for Segment</Label></div>
            </div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.media_title || !form.project_id}>{editing ? 'Update' : 'Register'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}