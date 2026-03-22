import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import PermissionNotice from '@/components/ui/PermissionNotice';
import PublishBadge from '@/components/ui/PublishBadge';
import VisibilityBadge, { VISIBILITY_EXPLANATIONS } from '@/components/ui/VisibilityBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { OperatingGuide, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { getClientProjectViewerModel, getProjectDetailSummary, getProjectPublishWarnings } from '@/lib/domainWorkflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { useUserProfile } from '@/lib/useUserProfile';
import { getRoleLabel } from '@/lib/roleUtils';
import { AlertTriangle, ArrowLeft, Bookmark, Camera, Eye, FileVideo, MapPin, ShieldCheck, Users } from 'lucide-react';

function SummaryToneCard({ title, value, detail, tone = 'default' }) {
  const tones = {
    default: 'border-border bg-card',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
    success: 'border-emerald-200 bg-emerald-50',
    info: 'border-blue-200 bg-blue-50',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.default}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function ProjectDetail() {
  const projectId = window.location.pathname.split('/').pop();
  const { data: instructions = [] } = usePageInstructions('project_detail');
  const { profile, isDocumenter, isAdmin } = useUserProfile();
  const { data: projectResults = [] } = useQuery({ queryKey: ['project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments', projectId], queryFn: () => base44.entities.StreetSegment.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', projectId], queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: media = [] } = useQuery({ queryKey: ['media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: markers = [] } = useQuery({ queryKey: ['markers', projectId], queryFn: () => base44.entities.MediaMarker.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: routes = [] } = useQuery({ queryKey: ['routes-by-project', projectId], queryFn: () => base44.entities.RoutePath.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: accessAssignments = [] } = useQuery({ queryKey: ['project-access', projectId], queryFn: () => base44.entities.UserProfile.list('-created_date', 200), enabled: !!projectId });
  const project = projectResults[0];

  const { readiness, mediaCounts, markerCounts, summaryCards, publishSummary } = useMemo(
    () => getProjectDetailSummary({ project, segments, sessions, media, markers, routes }),
    [project, segments, sessions, media, markers, routes],
  );
  const publishWarnings = useMemo(() => getProjectPublishWarnings({ project, segments, sessions, media, markers, routes }), [project, segments, sessions, media, markers, routes]);
  const previewModel = useMemo(() => getClientProjectViewerModel({ project, segments, media, markers, previewMode: true }), [project, segments, media, markers]);

  if (!project) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const scopedAssignments = accessAssignments.filter((user) => user.client_organization_id === project.client_organization_id || user.role === 'documenter' || user.role === 'company_admin' || user.role === 'super_admin');
  const publishState = project.published_to_client ? 'client_published' : readiness.publishReadiness ? 'publish_ready' : 'publish_blocked';

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={`${project.project_code} · ${project.municipality || ''} ${project.state || ''}`}>
        <StatusBadge status={project.project_status} />
        <StatusBadge status={project.documentation_status} />
        <PublishBadge state={publishSummary.phase} />
        <PublishBadge state={publishState} />
        {project.published_to_client && <StatusBadge status="published" />}
      </PageHeader>

      <PermissionNotice
        audience={['Super Admin and Company Admin can manage project scope, QA, publish readiness, client preview interpretation, and access assignments.', 'Documenters should use this page to understand blockers, but should not treat internal readiness as permission to expose content externally.', 'Client users do not access this company-side detail page; they only see the curated portal package after publication.']}
        internalData="Operational blockers, internal notes, route/session gaps, marker review maturity, safe-media checks, and workflow-only fields remain internal to CCG."
        clientVisibleData="Only the client-facing package shown in the preview summary becomes visible after publication: approved client notes, publish-safe media, and confirmed client-visible markers."
        publishingEffect="Publishing moves reviewed client-safe content into the client portal. It does not expose raw records, internal notes, field QA notes, or route/session workflow metadata."
        mistakesToAvoid="Do not publish because a project looks mostly complete. Missing route data, unreviewed markers, unsafe media, or draft client notes can leak confusion even when the package appears close to done."
      />

      <OperatingGuide
        title="Project Publishing and Handoff Guide"
        description="Use this page to separate draft production data, internally reviewed deliverables, and the actual client-visible published package. Everything below should help staff decide whether the project is still being built, ready for internal sign-off, or genuinely safe to hand off to the client portal."
        instructionCards={instructions}
        sections={[
          { heading: 'What publishing means', body: 'Publishing is the deliberate step that exposes the approved client package in the portal. It should happen only after required views, routes, sessions, notes, markers, and media safety checks all pass.' },
          { heading: 'What becomes visible', body: 'Clients only receive approved project summaries, client-visible segment notes, publish-safe media, and confirmed markers tied to that published media.' },
          { heading: 'What remains internal', body: 'Internal notes, QA notes, field-only commentary, route-building context, workflow blockers, expected-views metadata, and any non-publish-safe media stay hidden from client views.' },
          { heading: 'What to review first', body: ['Confirm every scoped segment has route and session coverage.', 'Validate that each required view type has client-safe media coverage.', 'Clean client-visible notes so they do not include draft/internal wording.', 'Confirm markers shown to clients are reviewed and tied to safe published media.'] },
          { heading: 'Mistakes to avoid', body: ['Do not confuse internally reviewed data with client-visible published data.', 'Do not publish media just because a file exists; it must also be preview-safe and thumbnail-safe where applicable.', 'Do not let client-visible notes mirror internal notes or QA language.', 'Do not assume missing client content was deleted; it may still be correctly blocked from publication.'] },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryToneCard
            key={card.label}
            title={card.label}
            value={card.value}
            detail={card.detail}
            tone={card.ready ? 'success' : card.label === 'Publish state' ? 'danger' : 'warning'}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryToneCard title="Draft data" value={publishSummary.phase === 'draft_data' ? 'Yes' : 'No'} detail="Draft data is still internal-only and must not be treated as a client handoff." tone={publishSummary.phase === 'draft_data' ? 'warning' : 'success'} />
        <SummaryToneCard title="Internally reviewed" value={publishSummary.phase !== 'draft_data' ? 'Yes' : 'No'} detail="Internal review means CCG believes the package is operationally complete, but it may still be unpublished." tone={publishSummary.phase !== 'draft_data' ? 'info' : 'warning'} />
        <SummaryToneCard title="Client visible now" value={project.published_to_client ? 'Yes' : 'No'} detail="This indicates whether the client portal is currently showing the package, not whether draft data exists." tone={project.published_to_client ? 'success' : 'warning'} />
        <SummaryToneCard title="Publish blockers" value={publishSummary.blockers} detail={`${publishSummary.warnings} warning states also remain open.`} tone={publishSummary.blockers ? 'danger' : publishSummary.warnings ? 'warning' : 'success'} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><StatCard title="Segments" value={segments.length} icon={MapPin} /><StatCard title="Sessions" value={sessions.length} icon={Camera} /><StatCard title="Media Files" value={media.length} icon={FileVideo} /><StatCard title="Markers" value={markers.length} icon={Bookmark} /></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Publish checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Review this checklist in order: first make sure the project is no longer draft-only, then confirm route/session/view coverage, then validate notes and publish-safe media, and only then treat the package as ready for client handoff.
            </div>
            {readiness.checklist.map((item) => (
              <div key={item.key} className={`rounded-lg border p-3 ${item.status === 'blocked' ? 'border-red-200 bg-red-50' : item.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium">{item.label}</p>
                  <div className="flex gap-2 flex-wrap">
                    <PublishBadge state={item.status === 'ready' ? 'publish_ready' : item.status === 'warning' ? 'needs_review' : 'publish_blocked'} />
                    <Badge variant={item.ready ? 'default' : 'secondary'}>{item.status === 'ready' ? 'Ready' : item.status === 'warning' ? 'Warning' : 'Blocked'}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-6">{item.reason}</p>
              </div>
            ))}
            {!!publishWarnings.length && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Publish safeguards</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-900/80 space-y-1">{publishWarnings.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <p className="mt-3 text-xs text-amber-900/80">Expected business result: clients should only see a complete, review-clean package. These safeguards block accidental publication of partial scope, missing media views, route/session gaps, or internal-only language.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Operational readiness and publish phase</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[['Route completeness', readiness.routeCompleteness], ['Session completeness', readiness.sessionCompleteness]].map(([label, value]) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-sm"><span>{label}</span><span>{value}%</span></div>
                <Progress value={value} />
              </div>
            ))}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Uploads</p><Badge variant={readiness.uploadReadiness ? 'default' : 'secondary'}>{readiness.uploadReadiness ? 'Ready' : 'Pending'}</Badge></div>
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Internal review</p><PublishBadge state={publishSummary.phase === 'draft_data' ? 'needs_review' : 'publish_ready'} /></div>
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Publish</p><PublishBadge state={readiness.publishReadiness ? 'publish_ready' : 'publish_blocked'} /></div>
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Portal state</p><PublishBadge state={project.published_to_client ? 'client_published' : 'draft_data'} /></div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground leading-6">
              Internal review means the package has cleared the company-side gate. Client publication means the curated package is actually visible in the portal. Those two states should never be treated as interchangeable.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Client preview snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground leading-6">
              This preview estimates what a client would see if only publish-safe, client-approved content were shown right now. It intentionally hides internal notes, QA notes, workflow-only metadata, and any assets that are not safe for publish.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryToneCard title="Preview segments" value={previewModel.clientVisibleProjectData.segments.length} detail="Segments eligible for the portal once client-safe content is considered." tone="info" />
              <SummaryToneCard title="Preview media" value={previewModel.publishedMedia.length} detail="Publish-safe media records currently selected for client exposure." tone={previewModel.publishedMedia.length ? 'success' : 'warning'} />
              <SummaryToneCard title="Preview markers" value={previewModel.clientMarkers.length} detail="Confirmed client-visible markers linked to publish-safe media." tone={previewModel.clientMarkers.length ? 'success' : 'warning'} />
            </div>
            <div className="space-y-3">
              {previewModel.filteredMedia.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{item.media_title_override_for_client || item.media_title}</p>
                    <VisibilityBadge visibility="client_visible" />
                    <PublishBadge state="publish_ready" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-6">{item.client_visible_notes || 'Client-safe media with no additional note provided.'}</p>
                </div>
              ))}
              {!previewModel.filteredMedia.length && <p className="text-sm text-muted-foreground">No publish-safe media is currently available for preview.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Project access and handoff review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground leading-6">Use this assignment review to confirm who can invite, edit, review, and publish. A strong handoff requires clear ownership on both the company side and the client side before publication begins.</div>
            {scopedAssignments.slice(0, 8).map((user) => {
              const roleLabel = getRoleLabel(user.role);
              const isClientSide = ['client_manager', 'client_viewer'].includes(user.role);
              return <div key={user.id} className="rounded-lg border p-3 flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{user.full_name}</p><p className="text-xs text-muted-foreground">{roleLabel} · {user.email}</p></div><div className="flex gap-2 flex-wrap justify-end"><Badge variant="outline">{isClientSide ? 'Read' : 'Edit'}</Badge><Badge variant="outline">{user.role === 'client_manager' || isAdmin ? 'Invite' : 'No Invite'}</Badge><Badge variant="outline">{user.role === 'super_admin' || user.role === 'company_admin' ? 'Publish' : 'No Publish'}</Badge><Badge variant="outline">{isClientSide ? 'Client Review' : 'Internal Review'}</Badge></div></div>;
            })}
            {scopedAssignments.length === 0 && <p className="text-sm text-muted-foreground">No matching assignments were found for this project scope.</p>}
            <p className="text-xs text-muted-foreground">Current viewer role: {getRoleLabel(profile?.role)}. {isDocumenter ? 'Documenters should stay within field and evidence workflows and leave the final client handoff to designated reviewers/admins.' : 'Admins should verify publish and invite rights before portal release.'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Operational counts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm font-medium mb-2">Media by type</p><div className="flex flex-wrap gap-2">{Object.entries(mediaCounts).map(([type, count]) => <Badge key={type} variant="outline">{type}: {count}</Badge>)}{Object.keys(mediaCounts).length === 0 && <p className="text-sm text-muted-foreground">No media yet.</p>}</div></div>
            <div><p className="text-sm font-medium mb-2">Marker visibility mix</p><div className="flex flex-wrap gap-2">{Object.entries(markerCounts).map(([type, count]) => <div key={type} className="flex items-center gap-2"><VisibilityBadge visibility={type === 'unknown' ? 'needs_review' : type} /><span className="text-sm text-muted-foreground">{count}</span></div>)}{Object.keys(markerCounts).length === 0 && <p className="text-sm text-muted-foreground">No markers yet.</p>}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Project-level publish summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Current phase</p><PublishBadge state={publishSummary.phase} /></div><p className="mt-2 text-sm text-muted-foreground leading-6">{publishSummary.phaseLabel} describes whether this project is still draft/internal, internally reviewed, or already visible to the client portal.</p></div>
            <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Selected media vs safe media</p><Badge variant="outline">{publishSummary.safeMedia}/{publishSummary.selectedMedia}</Badge></div><p className="mt-2 text-sm text-muted-foreground leading-6">Only publish-safe media should survive the client preview and final handoff experience.</p></div>
            <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Reviewed markers</p><Badge variant="outline">{publishSummary.reviewedMarkers}/{publishSummary.totalMarkers}</Badge></div><p className="mt-2 text-sm text-muted-foreground leading-6">Client-visible markers should be confirmed so portal annotations do not communicate uncertain or internal-only guidance.</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowStepsPanel title="Operational workflow" steps={[{ title: 'Plan and route segments', description: 'Every segment should gain a route path and session plan before field execution begins so publish blockers are caught early.' }, { title: 'Complete capture and upload', description: 'Sessions and media should close required view gaps and create a safe publish candidate set for internal review.' }, { title: 'Review, preview, and publish', description: 'Validate notes, confirm markers, inspect the client preview, and only then move the package into the client portal.' }]} />
        <QAReviewChecklist title="Publishing QA / review checklist" items={[{ title: 'Coverage checks', description: 'Compare segments, routes, sessions, and media so missing operational scope is caught before handoff.' }, { title: 'Client-safe notes', description: 'Review all client-visible notes for draft wording, internal references, and mirrored QA language.' }, { title: 'Publish-safe media', description: 'Confirm preview/thumbnail/readiness coverage before any file is treated as safe for client exposure.' }]} />
      </div>

      <VisibilityRulesPanel rules={[...VISIBILITY_EXPLANATIONS.map((rule) => ({ title: rule.label, description: rule.description })), { title: 'Publish Blocked', description: 'A blocked project has missing or unsafe items that must remain internal until corrected.' }, { title: 'Publish Ready', description: 'A ready project has cleared the internal gate, but client visibility still depends on publication actually being enabled.' }, { title: 'Internal notes and QA notes', description: 'These remain hidden from all client views and should never be copied directly into client-visible notes.' }]} />
      <InstructionPanel instructions={instructions} />
    </div>
  );
}
