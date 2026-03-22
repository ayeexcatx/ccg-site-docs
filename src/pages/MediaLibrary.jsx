import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import HowThisWorks from '@/components/ui/HowThisWorks';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import FutureReadyPanel from '@/components/ui/FutureReadyPanel';
import {
  DocumentationPageIntro,
  QAReviewChecklist,
  VisibilityRulesPanel,
  WorkflowStepsPanel,
} from '@/components/ui/OperatingGuidance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  File,
  FileVideo,
  Globe,
  HardDrive,
  Image,
  Layers3,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { VIEW_TYPE_LABELS } from '@/lib/constants';
import { buildMediaAiPreparation, createViewerCapabilityMatrix, getStorageAdapterBlueprints, resolveStorageAdapter } from '@/lib/futureArchitecture';

const MEDIA_TYPES = ['photo', 'video', 'video_360', 'thumbnail', 'preview_clip', 'document', 'export'];
const MEDIA_ICONS = { photo: Image, video: Video, video_360: Globe, thumbnail: Image, preview_clip: Video, document: File, export: File };
const STORAGE_MODES = ['native_upload', 'external_link', 'future_connector_storage'];
const PROCESSING_STATUSES = ['uploaded', 'processing', 'ready', 'error', 'archived'];
const PUBLISH_READINESS = ['not_reviewed', 'needs_preview', 'needs_thumbnail', 'qa_hold', 'ready_for_publish', 'published'];
const ORIGINAL_FILE_POLICIES = ['keep_in_app', 'register_external_master', 'archive_external_master'];

const emptyMedia = {
  project_id: '',
  street_segment_id: '',
  capture_session_id: '',
  upload_batch_id: '',
  media_type: 'video',
  media_title: '',
  original_filename: '',
  source_kind: 'native_upload',
  storage_mode: 'native_upload',
  original_file_policy: 'keep_in_app',
  file_url: '',
  original_file_url: '',
  preview_url: '',
  thumbnail_url: '',
  preview_status: 'missing',
  thumbnail_status: 'missing',
  processing_status: 'uploaded',
  publish_readiness: 'not_reviewed',
  publish_to_client: false,
  client_safe_media_id: '',
  is_primary_for_segment: false,
  is_long_form: false,
  long_form_minutes: '',
  is_360_media: false,
  external_storage_label: '',
  external_storage_path: '',
  media_title_override_for_client: '',
  view_type: 'profile',
  direction_label: '',
  side_of_street: 'both',
  internal_notes: '',
  client_visible_notes: '',
};

function SummaryStatCard({ icon: Icon, title, value, description, tone = 'default' }) {
  const toneStyles = {
    default: 'border-border',
    warning: 'border-amber-200 bg-amber-50/50',
    danger: 'border-red-200 bg-red-50/50',
    success: 'border-emerald-200 bg-emerald-50/50',
  };

  return (
    <Card className={toneStyles[tone] || toneStyles.default}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-background p-2 shadow-sm"><Icon className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryAlertList({ title, icon: Icon, items, emptyMessage }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : items.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.badges?.map((badge) => <Badge key={badge} variant="outline">{badge}</Badge>)}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, helper }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || '—'}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>}
    </div>
  );
}

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
  const { data: uploadBatches = [] } = useQuery({ queryKey: ['upload-batches'], queryFn: () => base44.entities.UploadBatch.list('-created_date', 100) });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.MediaFile.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); closeForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaFile.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyMedia); };
  const openEdit = (media) => {
    setEditing(media);
    setForm({ ...emptyMedia, ...media });
    setShowForm(true);
  };
  const handleSave = () => {
    const normalized = {
      ...form,
      is_360_media: form.media_type === 'video_360' || form.view_type === '360_walk' || form.is_360_media,
      source_kind: form.storage_mode === 'external_link' ? 'external_link' : form.source_kind,
      preview_status: form.preview_url ? 'ready' : form.preview_status,
      thumbnail_status: form.thumbnail_url ? 'ready' : form.thumbnail_status,
    };
    editing ? updateMut.mutate({ id: editing.id, data: normalized }) : createMut.mutate(normalized);
  };

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.project_name]));
  const segmentMap = Object.fromEntries(segments.map((segment) => [segment.id, segment.segment_name || segment.segment_code || 'Segment']));
  const sessionMap = Object.fromEntries(sessions.map((session) => [session.id, session.session_name]));
  const batchMap = Object.fromEntries(uploadBatches.map((batch) => [batch.id, batch.batch_name]));

  const storageBlueprints = getStorageAdapterBlueprints();

  const filtered = useMemo(() => mediaFiles.filter((media) => {
    const haystack = [media.media_title, media.original_filename, media.external_storage_label, media.internal_notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchSearch = haystack.includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || media.media_type === typeFilter;
    return matchSearch && matchType;
  }), [mediaFiles, search, typeFilter]);

  const summary = useMemo(() => {
    const missingPreviews = mediaFiles.filter((media) => (media.media_type === 'video' || media.media_type === 'video_360') && !media.preview_url);
    const missingThumbnails = mediaFiles.filter((media) => !media.thumbnail_url && media.media_type !== 'document');
    const notReady = mediaFiles.filter((media) => media.publish_to_client && media.publish_readiness !== 'ready_for_publish' && media.publish_readiness !== 'published');
    const storageIssues = mediaFiles.filter((media) => {
      if (media.storage_mode === 'external_link') return !media.file_url || !media.external_storage_label;
      if (media.storage_mode === 'native_upload') return Boolean(media.external_storage_path) || media.source_kind === 'external_link';
      return false;
    });

    return {
      longFormCount: mediaFiles.filter((media) => media.is_long_form || Number(media.duration_seconds) >= 1200).length,
      immersiveCount: mediaFiles.filter((media) => media.media_type === 'video_360' || media.is_360_media || media.view_type === '360_walk').length,
      externalCount: mediaFiles.filter((media) => media.storage_mode === 'external_link').length,
      uploadBatchLinkedCount: mediaFiles.filter((media) => media.upload_batch_id).length,
      missingPreviews,
      missingThumbnails,
      notReady,
      storageIssues,
    };
  }, [mediaFiles]);

  const selectedStorage = resolveStorageAdapter(form.storage_mode);
  const selectedViewer = createViewerCapabilityMatrix(form);
  const aiPreparation = buildMediaAiPreparation({ mediaFile: form, markerCount: mediaFiles.filter((media) => media.capture_session_id === form.capture_session_id).length, publishReadiness: form.publish_readiness });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Manage roadway media records, review publish-safe derivatives, and keep long-form or 360 assets ready for future storage extensions."
        helpText="Media records should stay in-house-first. Register the operational record here even when the original file lives in an approved external location."
      >
        <Button size="sm" className="gap-2" onClick={() => { setForm(emptyMedia); setShowForm(true); }}><Plus className="w-4 h-4" /> Register Media</Button>
      </PageHeader>

      <DocumentationPageIntro
        header={{
          title: 'Media operations guide',
          purpose: 'This page is the master operating surface for creating media records, linking uploads to sessions and batches, and deciding which preview-safe assets may appear in client-facing views.',
          role: 'Documentation managers, upload coordinators, QA reviewers, and admins responsible for release controls.',
          workflowSummary: 'Create or register media, connect it to the correct project/segment/session/batch, verify preview and thumbnail derivatives, review readiness, then expose only approved client-safe media.',
          visibilityRules: 'Original masters, internal notes, and operational storage details remain internal. Only explicitly publish-safe items should be exposed to clients, ideally by way of preview derivatives rather than original masters.',
          nextSteps: 'Use the summary cards to find missing operational work, open a media record to inspect readiness, and only publish when processing, preview, thumbnail, and QA indicators are aligned.',
        }}
        guide={{
          description: 'The Media Library should explain the production workflow directly in the UI so staff can make consistent operational decisions for standard files, long-form roadway videos, and future 360 media without needing external SOPs.',
          sections: [
            {
              heading: 'When to use native upload',
              body: [
                'Use native upload for normal in-house managed media, especially review copies, thumbnails, still photos, short video clips, and project files that the current application can reliably host and inspect.',
                'Native upload keeps operations simple because the file record, preview, thumbnail, publish flags, and QA workflow all stay in one internal path. This should remain the default unless the original asset is too large or must stay in a governed archive.',
              ],
            },
            {
              heading: 'When to register an external file',
              body: [
                'Register an external file when the operational record must exist in the portal, but the original master is too large, too long, or administratively required to live in an approved external repository or archive.',
                'When using an external link, keep the record in-house-first by storing operational metadata here, providing a reliable preview or proxy asset for review, and documenting the storage label/path so admins can trace the authoritative original without exposing that location to clients.',
              ],
            },
            {
              heading: 'How previews relate to originals',
              body: [
                'Treat the original file as the preservation or source-quality record. Treat the preview as the staff review and client-safe derivative used for quick loading, browser playback, and controlled publishing.',
                'Long-form videos and 360 media should generally have a lighter preview derivative and a thumbnail even if the original remains external. Missing previews should block client publishing unless leadership has approved an exception.',
              ],
            },
            {
              heading: 'Operational handling for long-form and 360 media',
              body: [
                'Long-form roadway videos often require separate handling because the original file size, ingest time, and review burden are larger than normal clips. Keep those records linked to upload batches, track processing state carefully, and publish from preview-safe derivatives rather than full-resolution masters.',
                'Future 360 media should still be registered now with complete metadata. Mark the record clearly, maintain a preview workflow, and preserve enough information so an approved immersive viewer can be added later without remapping the media library.',
              ],
            },
            {
              heading: 'How to choose client-visible media',
              body: [
                'Client-visible media should be chosen intentionally from records that are QA-reviewed, have usable thumbnails, have publish-safe preview assets, and do not depend on fragile admin-only storage paths.',
                'If a record is not ready for publish, leave it internal even if the original content is valuable. The client portal should prioritize stability, fast loading, and operational clarity over showing every available source file.',
              ],
            },
          ],
        }}
      />

      <HowThisWorks
        title="Media workflow quick guidance"
        items={[
          'Create a media record for every operationally relevant file, whether the bytes are uploaded natively or registered from an approved external location.',
          'Link every record to the correct project, segment, capture session, and upload batch whenever possible so long-form and repeat captures stay traceable.',
          'Store original file details separately from previews and thumbnails. The original is the master; the preview is the review-safe and publish-safe derivative.',
          'Use long-form and 360 flags to make future workflow routing explicit now, even before a dedicated storage connector or immersive viewer exists.',
          'Do not publish client-visible media until processing, preview, thumbnail, and QA indicators all support a stable external experience.',
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={Video} title="Long-form video records" value={summary.longFormCount} description="Records marked as long-form or exceeding 20 minutes. Review these for preview derivatives, batch traceability, and storage strategy." />
        <SummaryStatCard icon={Globe} title="360 media records" value={summary.immersiveCount} description="Media that already requires future immersive-readiness metadata and careful client exposure rules." />
        <SummaryStatCard icon={Link2} title="External-file registrations" value={summary.externalCount} description="Records whose authoritative original is outside the native upload path. Keep metadata internal and derivatives reviewable." tone={summary.externalCount ? 'warning' : 'default'} />
        <SummaryStatCard icon={Layers3} title="Batch-linked media" value={summary.uploadBatchLinkedCount} description="Records linked to upload batches for operational tracking, especially useful for large ingest events and long-form captures." tone={summary.uploadBatchLinkedCount ? 'success' : 'warning'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryAlertList
          title="Missing previews"
          icon={AlertTriangle}
          emptyMessage="All video-oriented records currently have preview links."
          items={summary.missingPreviews.slice(0, 6).map((media) => ({
            id: media.id,
            title: media.media_title,
            badges: [media.media_type, media.storage_mode],
            description: 'Create or register a lighter preview asset before asking staff or clients to use this record for review. Long-form and 360 records should not rely on the original file alone.',
          }))}
        />
        <SummaryAlertList
          title="Missing thumbnails"
          icon={Image}
          emptyMessage="All non-document records currently have thumbnails."
          items={summary.missingThumbnails.slice(0, 6).map((media) => ({
            id: media.id,
            title: media.media_title,
            badges: [media.media_type],
            description: 'Generate or attach a thumbnail so staff can visually verify the record and so the client portal can present stable media choices.',
          }))}
        />
        <SummaryAlertList
          title="Not ready for publish"
          icon={ShieldCheck}
          emptyMessage="No currently published media records are blocked by readiness flags."
          items={summary.notReady.slice(0, 6).map((media) => ({
            id: media.id,
            title: media.media_title,
            badges: [media.publish_readiness || 'unknown', media.processing_status || 'unknown'],
            description: 'This record is marked for client publishing but still has readiness issues. Resolve QA, preview, or thumbnail gaps before exposing it externally.',
          }))}
        />
        <SummaryAlertList
          title="Storage-mode inconsistencies"
          icon={HardDrive}
          emptyMessage="No obvious native/external storage mismatches were detected."
          items={summary.storageIssues.slice(0, 6).map((media) => ({
            id: media.id,
            title: media.media_title,
            badges: [media.storage_mode || 'unset'],
            description: 'The selected storage mode does not match the supporting fields on the record. Review source kind, file URL, storage label, and external path details before relying on this record operationally.',
          }))}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <WorkflowStepsPanel
          title="Operational workflow for production media"
          steps={[
            { title: 'Register the operational record', description: 'Create the MediaFile entry first and capture the project, segment, session, and if applicable upload batch. This record should exist even when the master file stays outside the app.' },
            { title: 'Choose the storage pattern', description: 'Use native upload by default. Switch to an external-link pattern only when the original is too large, archival requirements demand it, or long-form source footage needs separate storage discipline.' },
            { title: 'Attach publish-safe derivatives', description: 'Provide preview and thumbnail assets that staff and clients can load quickly. This is especially important for long-form roadway video and future 360 captures.' },
            { title: 'Review processing and QA status', description: 'Track whether ingest, derivative generation, and internal review are complete. A usable file is not automatically a publish-ready file.' },
            { title: 'Publish intentionally', description: 'Select a client-safe record or derivative only after readiness checks pass. Client exposure should favor the stable preview representation rather than raw masters.' },
          ]}
        />

        <QAReviewChecklist
          title="Media QA / release checklist"
          items={[
            { title: 'Session and segment linkage confirmed', description: 'Every media record should be tied to the correct project context so reviewers can understand where the footage belongs in the roadway documentation workflow.' },
            { title: 'Preview and thumbnail present', description: 'Video, long-form, and 360 records should have derivatives for review. Missing preview or thumbnail assets should normally block release.' },
            { title: 'Storage path is internally traceable', description: 'If the original is external, confirm the record includes the approved storage label/path and that staff can retrieve the authoritative master without exposing raw storage details to clients.' },
            { title: 'Publish readiness is explicit', description: 'Do not infer readiness from a file URL alone. Use the processing and publish-readiness fields to communicate whether the asset is actually safe to expose.' },
          ]}
        />
      </div>

      <VisibilityRulesPanel
        rules={[
          { title: 'Prefer previews over originals', description: 'Client-facing selections should point to stable preview-safe derivatives unless there is a documented operational reason to expose the original file.' },
          { title: 'Keep external storage details internal', description: 'Storage bucket names, archive paths, and retrieval notes belong in admin guidance and internal notes, not in client-visible labels.' },
          { title: 'Block incomplete records from release', description: 'Any record missing a preview, thumbnail, or QA decision should remain internal even if it is otherwise searchable by staff.' },
          { title: 'Use 360 publication sparingly until the viewer exists', description: 'Mark 360 records now, but keep them internal or clearly limited until an approved immersive presentation path is ready.' },
        ]}
      />

      <FutureReadyPanel
        title="Media future-ready areas"
        description="These workflow notes keep the current app in-house-first while making room for larger source files and future 360 delivery without forcing a third-party provider into the current design."
        items={[
          {
            key: 'aiMediaPrep',
            title: 'AI tagging preparation layer',
            status: aiPreparation.preparationStatus,
            summary: 'Create review-only staging areas for future AI landmark, sign, and business suggestions without making AI part of the required media workflow.',
            notice: aiPreparation.requiredReviewMessage,
            workflow: 'Media records stay manual-first. Future AI suggestions can be attached as draft helper queues, but staff still decide whether to accept, edit, reject, or ignore them.',
            entities: ['MediaFile', 'MediaMarker', 'ReviewCaseItem'],
            actions: ['Accept into manual review', 'Edit suggestion', 'Reject suggestion'],
            extensionPoints: [...aiPreparation.placeholderQueues.map((queue) => `${queue.title}: ${queue.description}`), ...aiPreparation.workflowHooks],
          },
          {
            key: 'viewer360',
            title: '360 viewer extension point',
            status: 'Extension-ready',
            summary: '360-capable records should keep using the same operational metadata as other media so a future immersive viewer can attach later without changing how staff register, review, or publish files today.',
            workflow: 'Operations register the record now, attach preview-safe derivatives now, and reserve immersive playback for a future approved renderer.',
            entities: ['Project', 'CaptureSession', 'MediaFile'],
            extensionPoints: filtered.slice(0, 2).map((media) => createViewerCapabilityMatrix(media).adminExplanation),
          },
          {
            key: 'storageAdapters',
            title: 'External storage adapter extension point',
            status: 'In-house-first',
            summary: 'The application should continue owning the operational record, publish rules, and QA workflow even if very large originals eventually live in an in-house object store or approved enterprise archive.',
            workflow: 'Admins register metadata internally, storage adapters explain where bytes live, and publishing decisions still rely on internal readiness fields rather than vendor-specific behavior.',
            entities: ['MediaFile', 'UploadBatch', 'CaptureSession', 'Project'],
            extensionPoints: storageBlueprints.map((adapter) => `${adapter.label}: ${adapter.adminNotes}`),
          },
        ]}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search media..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEDIA_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileVideo} title="No media files found" description="Register or upload media files to build your documentation library." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((media) => {
            const MediaIcon = MEDIA_ICONS[media.media_type] || File;
            const publishTone = media.publish_readiness === 'ready_for_publish' || media.publish_readiness === 'published';
            return (
              <Card key={media.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(media)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {media.thumbnail_url ? <img src={media.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <MediaIcon className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{media.media_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{projectMap[media.project_id] || '—'} · {VIEW_TYPE_LABELS[media.view_type] || media.view_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{sessionMap[media.capture_session_id] || 'No session'} · {batchMap[media.upload_batch_id] || 'No batch'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{media.media_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{media.storage_mode || 'storage unset'}</Badge>
                    {media.is_long_form && <Badge variant="outline" className="text-[10px]">long-form</Badge>}
                    {(media.is_360_media || media.media_type === 'video_360') && <Badge variant="outline" className="text-[10px]">360</Badge>}
                    <StatusBadge status={media.processing_status} />
                    <Badge className={`text-[10px] ${publishTone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{media.publish_readiness || 'not reviewed'}</Badge>
                    {media.publish_to_client && <Badge className="bg-blue-100 text-blue-800 text-[10px]">Client selected</Badge>}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {media.preview_url ? 'Preview ready.' : 'Preview missing.'} {media.thumbnail_url ? 'Thumbnail ready.' : 'Thumbnail missing.'} {media.storage_mode === 'external_link' ? 'Original registered externally.' : 'Original managed in-house.'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Media' : 'Register Media File'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-semibold">Operating instructions for this form</p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                  <p>Create one record per operational asset. If you have both an original master and a preview derivative, keep them traceable here so reviewers know which file is for preservation and which is safe for quick playback or client delivery.</p>
                  <p>Use native upload by default. Use external registration when the source file is too large for normal in-app handling or must remain in an approved archive. Either way, keep publish decisions in this system.</p>
                  <p>Long-form roadway video and future 360 capture should usually publish from preview-safe derivatives, not from raw masters. Missing previews or thumbnails should usually keep the record internal.</p>
                  <p>Any future AI landmark, sign, or business tagging attached to this media record must remain draft-only. AI is an assistant, not a source of final truth, and staff review is required before those suggestions enter Marker Review or any evidence workflow.</p>
                </div>
              </div>

              <div><Label>Title *</Label><Input value={form.media_title} onChange={e => setForm({ ...form, media_title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Media Type</Label>
                  <Select value={form.media_type} onValueChange={value => setForm({ ...form, media_type: value, is_360_media: value === 'video_360' ? true : form.is_360_media })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MEDIA_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>View Type</Label>
                  <Select value={form.view_type} onValueChange={value => setForm({ ...form, view_type: value, is_360_media: value === '360_walk' ? true : form.is_360_media })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(VIEW_TYPE_LABELS).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project *</Label>
                  <Select value={form.project_id || 'none'} onValueChange={value => setForm({ ...form, project_id: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Street Segment</Label>
                  <Select value={form.street_segment_id || 'none'} onValueChange={value => setForm({ ...form, street_segment_id: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{segments.map((segment) => <SelectItem key={segment.id} value={segment.id}>{segment.segment_name || segment.segment_code || segment.id}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Capture Session</Label>
                  <Select value={form.capture_session_id || 'none'} onValueChange={value => setForm({ ...form, capture_session_id: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.session_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Upload Batch</Label>
                  <Select value={form.upload_batch_id || 'none'} onValueChange={value => setForm({ ...form, upload_batch_id: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{uploadBatches.map((batch) => <SelectItem key={batch.id} value={batch.id}>{batch.batch_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Storage Mode</Label>
                  <Select value={form.storage_mode} onValueChange={value => setForm({ ...form, storage_mode: value, source_kind: value === 'external_link' ? 'external_link' : 'native_upload' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STORAGE_MODES.map((mode) => <SelectItem key={mode} value={mode}>{mode.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Native upload is the in-house default. External registration is for oversized or archive-governed originals; keep the operational review workflow in this app either way.</p>
                </div>
                <div>
                  <Label>Original File Policy</Label>
                  <Select value={form.original_file_policy} onValueChange={value => setForm({ ...form, original_file_policy: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGINAL_FILE_POLICIES.map((policy) => <SelectItem key={policy} value={policy}>{policy.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Original Filename</Label><Input value={form.original_filename || ''} onChange={e => setForm({ ...form, original_filename: e.target.value })} /></div>
                <div><Label>Original File URL</Label><Input value={form.original_file_url || ''} onChange={e => setForm({ ...form, original_file_url: e.target.value })} placeholder="Authoritative master path or URL" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preview URL</Label><Input value={form.preview_url || ''} onChange={e => setForm({ ...form, preview_url: e.target.value, preview_status: e.target.value ? 'ready' : 'missing' })} placeholder="Review-safe derivative" /></div>
                <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url || ''} onChange={e => setForm({ ...form, thumbnail_url: e.target.value, thumbnail_status: e.target.value ? 'ready' : 'missing' })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Operational File URL</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="Current app playback or registration URL" /></div>
                <div><Label>External Storage Label</Label><Input value={form.external_storage_label || ''} onChange={e => setForm({ ...form, external_storage_label: e.target.value })} placeholder="Archive name, object store, etc." /></div>
              </div>

              <div><Label>External Storage Path</Label><Input value={form.external_storage_path || ''} onChange={e => setForm({ ...form, external_storage_path: e.target.value })} placeholder="Internal-only retrieval path or key" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Processing Status</Label>
                  <Select value={form.processing_status} onValueChange={value => setForm({ ...form, processing_status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROCESSING_STATUSES.map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Publish Readiness</Label>
                  <Select value={form.publish_readiness} onValueChange={value => setForm({ ...form, publish_readiness: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PUBLISH_READINESS.map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-lg border p-3"><Switch checked={form.is_long_form} onCheckedChange={value => setForm({ ...form, is_long_form: value })} /><Label>Long-form video</Label></div>
                <div className="flex items-center gap-2 rounded-lg border p-3"><Switch checked={form.is_360_media} onCheckedChange={value => setForm({ ...form, is_360_media: value })} /><Label>360 media record</Label></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Approx. long-form minutes</Label><Input type="number" value={form.long_form_minutes || ''} onChange={e => setForm({ ...form, long_form_minutes: e.target.value })} /></div>
                <div><Label>Client-safe record reference</Label><Input value={form.client_safe_media_id || ''} onChange={e => setForm({ ...form, client_safe_media_id: e.target.value })} placeholder="Derivative or sibling record ID" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-lg border p-3"><Switch checked={form.publish_to_client} onCheckedChange={value => setForm({ ...form, publish_to_client: value })} /><Label>Publish to Client</Label></div>
                <div className="flex items-center gap-2 rounded-lg border p-3"><Switch checked={form.is_primary_for_segment} onCheckedChange={value => setForm({ ...form, is_primary_for_segment: value })} /><Label>Primary for Segment</Label></div>
              </div>

              <div><Label>Client Title Override</Label><Input value={form.media_title_override_for_client || ''} onChange={e => setForm({ ...form, media_title_override_for_client: e.target.value })} placeholder="Optional simplified client label" /></div>
              <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></div>
              <div><Label>Client-visible Notes</Label><Textarea value={form.client_visible_notes} onChange={e => setForm({ ...form, client_visible_notes: e.target.value })} /></div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Media detail view</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Project" value={projectMap[form.project_id]} helper="Every media record should be anchored to a project before it is reviewed or published." />
                  <DetailRow label="Segment" value={segmentMap[form.street_segment_id]} helper="Segment linkage helps long-form media remain navigable inside roadway workflows." />
                  <DetailRow label="Session" value={sessionMap[form.capture_session_id]} helper="Capture session context explains when and how the asset was collected." />
                  <DetailRow label="Upload batch" value={batchMap[form.upload_batch_id]} helper="Batch linkage is recommended for large ingest events, especially long-form capture days." />
                  <DetailRow label="Storage adapter" value={selectedStorage?.label || 'Custom storage mode'} helper={selectedStorage?.adminNotes || 'If this record uses a custom path, document it thoroughly in internal notes.'} />
                  <DetailRow label="Viewer family" value={selectedViewer.viewerFamily} helper={selectedViewer.adminExplanation} />
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-purple-900">AI tagging preparation</p>
                    <p className="mt-1 text-sm font-medium text-purple-950">{aiPreparation.mediaLabel}</p>
                    <p className="mt-2 text-xs leading-5 text-purple-900">{aiPreparation.requiredReviewMessage}</p>
                    <div className="mt-3 space-y-2">
                      {aiPreparation.placeholderQueues.map((queue) => (
                        <div key={queue.key} className="rounded-md border bg-white/80 p-3">
                          <p className="text-sm font-medium text-purple-950">{queue.title}</p>
                          <p className="mt-1 text-xs leading-5 text-purple-900">{queue.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-purple-300 bg-white text-purple-900">Draft / Unconfirmed</Badge>
                            <Badge variant="outline" className="border-purple-300 bg-white text-purple-900">Accept</Badge>
                            <Badge variant="outline" className="border-purple-300 bg-white text-purple-900">Edit</Badge>
                            <Badge variant="outline" className="border-purple-300 bg-white text-purple-900">Reject</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DetailRow label="Preview status" value={form.preview_url ? 'Preview attached' : 'Preview missing'} helper="Preview derivatives are the normal review-safe and publish-safe path for long-form and 360 media." />
                  <DetailRow label="Thumbnail status" value={form.thumbnail_url ? 'Thumbnail attached' : 'Thumbnail missing'} helper="Thumbnails improve QA speed and client browsing stability." />
                  <DetailRow label="Publish selection" value={form.publish_to_client ? 'Selected for client exposure' : 'Internal only'} helper="Only select client exposure when readiness, QA, and derivative coverage are complete." />
                  <DetailRow label="Client-facing record" value={form.client_safe_media_id || 'Use this record directly'} helper="If the original should stay internal, point staff to the approved derivative or sibling publish-safe record here." />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Admin workflow guidance</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Native upload:</span> Use for most in-house managed photos, clips, previews, and thumbnails. This keeps review, storage, and publishing simpler.</p>
                  <p><span className="font-medium text-foreground">External registration:</span> Use when the master must stay in an approved archive or object store. Pair it with an accessible preview and complete internal retrieval notes.</p>
                  <p><span className="font-medium text-foreground">Long-form media:</span> Expect larger files, longer review windows, and stronger need for upload-batch tracking. Avoid publishing the raw master when a lighter preview will serve clients better.</p>
                  <p><span className="font-medium text-foreground">360 media:</span> Mark the record now, store enough metadata for future immersive playback, and keep client exposure conservative until the approved viewer exists.</p>
                  <p><span className="font-medium text-foreground">Publish-safe selection:</span> The record exposed to clients should have QA approval, a stable preview, and a thumbnail. If the master is external or heavy, publish from the derivative rather than the source.</p>
                </CardContent>
              </Card>
            </div>
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
